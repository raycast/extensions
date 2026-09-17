import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  launchCommand,
  type LaunchProps,
  LaunchType,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";
import { listInstalled, type InstalledTool, type InstalledVersion } from "./mise/installed";
import type { MiseLocation } from "./mise/locate";
import { uninstall, upgrade } from "./mise/operations";
import { listRemote } from "./mise/remote";
import { miseCommandLine } from "./terminal/script";
import { addGloballyTo, InstallTargetDropdown, UseGloballyIn, useInstallTarget } from "./ui/InstallTarget";
import { LoadError, loadErrorInView } from "./ui/LoadError";
import { MissingMise } from "./ui/MissingMise";
import { readPreferences, upgradeOptions, type MisePreferences } from "./ui/preferences";
import { RunInTerminalAction } from "./ui/runInTerminal";
import { runOperation } from "./ui/runOperation";
import { useMise } from "./ui/useMise";

type LaunchContext = { upgrade?: string };

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const mise = useMise();
  if (mise.status === "loading") return <List isLoading searchBarPlaceholder="Search installed tools" />;
  if (mise.status === "missing") return <MissingMise searched={mise.searched} />;
  return <InstalledTools location={mise.location} upgradeOnLaunch={props.launchContext?.upgrade} />;
}

function InstalledTools({ location, upgradeOnLaunch }: { location: MiseLocation; upgradeOnLaunch?: string }) {
  const installed = useCachedPromise(listInstalled, [location], loadErrorInView);
  const [prefs] = useState(readPreferences);
  const [showDetail, setShowDetail] = useState(false);
  const launchHandled = useRef(false);
  const afterUpgrade = useCallback(() => {
    installed.revalidate();
    refreshOutdated();
  }, [installed.revalidate]);

  useEffect(() => {
    if (!upgradeOnLaunch || launchHandled.current) return;
    launchHandled.current = true;
    const op = upgrade(upgradeOnLaunch === "all" ? undefined : upgradeOnLaunch, upgradeOptions(prefs));
    runOperation(location, op, afterUpgrade);
  }, [location, upgradeOnLaunch, afterUpgrade, prefs]);

  const tools = installed.data ?? [];
  const activeTools = tools.filter((tool) => tool.versions.some((v) => v.active));
  const inactiveTools = tools.filter((tool) => !tool.versions.some((v) => v.active));

  const renderItem = (tool: InstalledTool) => (
    <ToolItem
      key={tool.name}
      tool={tool}
      location={location}
      prefs={prefs}
      revalidate={installed.revalidate}
      afterUpgrade={afterUpgrade}
      onToggleDetail={() => setShowDetail((value) => !value)}
    />
  );

  return (
    <List isLoading={installed.isLoading} isShowingDetail={showDetail} searchBarPlaceholder="Search installed tools">
      {installed.error && !installed.data ? (
        <LoadError error={installed.error} retry={installed.revalidate} />
      ) : (
        !installed.isLoading && (
          <List.EmptyView icon={Icon.Box} title="No installed tools" description="Add one from Search Tools" />
        )
      )}
      <List.Section title="Active" subtitle={String(activeTools.length)}>
        {activeTools.map(renderItem)}
      </List.Section>
      {prefs.showInactive && (
        <List.Section title="Inactive" subtitle={String(inactiveTools.length)}>
          {inactiveTools.map(renderItem)}
        </List.Section>
      )}
    </List>
  );
}

function refreshOutdated() {
  launchCommand({ name: "outdated-tools", type: LaunchType.Background }).catch(() => undefined);
}

function shownVersion(tool: InstalledTool): InstalledVersion {
  return tool.versions.find((v) => v.active) ?? tool.versions[tool.versions.length - 1];
}

function ToolItem({
  tool,
  location,
  prefs,
  revalidate,
  afterUpgrade,
  onToggleDetail,
}: {
  tool: InstalledTool;
  location: MiseLocation;
  prefs: MisePreferences;
  revalidate: () => void;
  afterUpgrade: () => void;
  onToggleDetail: () => void;
}) {
  const shown = shownVersion(tool);
  const subtitle =
    shown.requestedVersion && shown.requestedVersion !== shown.version
      ? `${shown.requestedVersion} → ${shown.version}`
      : shown.version;
  const accessories: List.Item.Accessory[] = [];
  if (tool.versions.length > 1) accessories.push({ text: `${tool.versions.length} versions` });
  if (shown.source) accessories.push({ tag: basename(shown.source.path) });

  const upgradeOp = upgrade(tool.name, upgradeOptions(prefs));
  const confirmUninstall = async (v: InstalledVersion) => {
    const unuse =
      prefs.uninstallRemovesConfig && v.source && v.requestedVersion
        ? { configFile: v.source.path, requested: v.requestedVersion }
        : undefined;
    const confirmed = await confirmAlert({
      title: `Uninstall ${tool.name}@${v.version}?`,
      message: unuse ? `Also removes ${tool.name} from ${basename(unuse.configFile)}` : undefined,
      primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await runOperation(location, uninstall(tool.name, v.version, { unuse }), revalidate);
  };

  return (
    <List.Item
      title={tool.name}
      subtitle={subtitle}
      keywords={tool.versions.map((v) => v.version)}
      accessories={accessories}
      detail={<List.Item.Detail markdown={detailMarkdown(tool)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Set Global Version…"
            icon={Icon.Pin}
            target={<VersionPicker location={location} tool={tool} jobs={prefs.jobs} onChanged={revalidate} />}
          />
          <Action
            title="Upgrade"
            icon={Icon.ArrowUp}
            onAction={() => runOperation(location, upgradeOp, afterUpgrade)}
          />
          <RunInTerminalAction command={miseCommandLine(location, upgradeOp)} />
          <ActionPanel.Submenu
            title="Uninstall Version…"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          >
            {tool.versions.map((v) => (
              <Action
                key={v.version}
                title={v.version}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => confirmUninstall(v)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action.ShowInFinder path={shown.installPath} />
          <Action.CopyToClipboard title="Copy Install Path" content={shown.installPath} />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}

function detailMarkdown(tool: InstalledTool): string {
  const lines = tool.versions.flatMap((v) => {
    const requested = v.requestedVersion ? ` — requested ${v.requestedVersion}` : "";
    const entry = [`- ${v.version}${v.active ? " (active)" : ""}${requested}`, `  - \`${v.installPath}\``];
    if (v.source) entry.push(`  - from \`${v.source.path}\``);
    return entry;
  });
  return [`# ${tool.name}`, "", ...lines].join("\n");
}

function VersionPicker({
  location,
  tool,
  jobs,
  onChanged,
}: {
  location: MiseLocation;
  tool: InstalledTool;
  jobs: number | undefined;
  onChanged: () => void;
}) {
  const remote = useCachedPromise(listRemote, [location, tool.name], loadErrorInView);
  const install = useInstallTarget(location);
  const { pop } = useNavigation();
  const installedByVersion = new Map(tool.versions.map((v) => [v.version, v]));
  const versions = [...(remote.data ?? [])].reverse();

  const useVersion = (version: string, configFile: string) => addGloballyTo(tool.name, version, { configFile, jobs });
  const setGlobal = async (version: string, configFile: string) => {
    await runOperation(location, useVersion(version, configFile), onChanged);
    pop();
  };

  return (
    <List
      isLoading={remote.isLoading}
      navigationTitle={`Set Global Version — ${tool.name}`}
      searchBarPlaceholder={`Search ${tool.name} versions`}
      searchBarAccessory={
        install.isLoading ? null : <InstallTargetDropdown files={install.files} onChange={install.setTarget} />
      }
    >
      {remote.error && !remote.data ? (
        <LoadError error={remote.error} retry={remote.revalidate} />
      ) : (
        !remote.isLoading && <List.EmptyView icon={Icon.MagnifyingGlass} title="No versions match" />
      )}
      {versions.map((v) => {
        const present = installedByVersion.get(v.version);
        const accessories: List.Item.Accessory[] = [];
        if (present?.active) accessories.push({ tag: "active" });
        if (v.createdAt) accessories.push({ text: v.createdAt.slice(0, 10) });
        return (
          <List.Item
            key={v.version}
            title={v.version}
            icon={present ? Icon.CheckCircle : Icon.Circle}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Global Version"
                  icon={Icon.Pin}
                  onAction={() => setGlobal(v.version, install.target)}
                />
                <UseGloballyIn files={install.files} onSelect={(configFile) => setGlobal(v.version, configFile)} />
                <RunInTerminalAction command={miseCommandLine(location, useVersion(v.version, install.target))} />
                {v.releaseUrl && <Action.OpenInBrowser title="Open Release Notes" url={v.releaseUrl} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
