import { Action, ActionPanel, Icon, Keyboard, launchCommand, type LaunchProps, LaunchType, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIT_SINCE, listVulnerabilities } from "./mise/audit";
import type { MiseLocation } from "./mise/locate";
import { upgrade } from "./mise/operations";
import { currentOutdated, listOutdated, outdatedSubtitle, outdatedVersions, type OutdatedTool } from "./mise/outdated";
import { atLeast } from "./mise/version";
import { miseCommandLine } from "./terminal/script";
import { LoadError, loadErrorInView } from "./ui/LoadError";
import { MiseUpdateListItem } from "./ui/MiseUpdate";
import { MissingMise } from "./ui/MissingMise";
import { outdatedOptions, readPreferences, upgradeOptions, type MisePreferences } from "./ui/preferences";
import { RunInTerminalAction } from "./ui/runInTerminal";
import { runOperation } from "./ui/runOperation";
import { useCommandSubtitle } from "./ui/useCommandSubtitle";
import { useMise } from "./ui/useMise";
import { VulnerableItem } from "./ui/Vulnerable";

type LaunchContext = { upgrade?: string };

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const mise = useMise();
  useCommandSubtitle(mise.status === "missing" ? "mise not found" : undefined);
  if (mise.status === "loading") return <List isLoading searchBarPlaceholder="Search outdated tools" />;
  if (mise.status === "missing") return <MissingMise searched={mise.searched} />;
  return <OutdatedTools location={mise.location} upgradeOnLaunch={props.launchContext?.upgrade} />;
}

function OutdatedTools({ location, upgradeOnLaunch }: { location: MiseLocation; upgradeOnLaunch?: string }) {
  const [prefs] = useState(readPreferences);
  const outdated = useCachedPromise(listOutdated, [location, outdatedOptions(prefs, location)], loadErrorInView);
  const data = currentOutdated(outdated.data);
  const auditSupported = atLeast(location.version, AUDIT_SINCE);
  // The audit only adds a section, so a failure to run it leaves the section off.
  const audit = useCachedPromise(listVulnerabilities, [location], {
    execute: auditSupported,
    onError: () => undefined,
  });
  const launchHandled = useRef(false);
  useCommandSubtitle(data && outdatedSubtitle(data));
  const revalidate = useCallback(() => {
    outdated.revalidate();
    // revalidate runs even when `execute` is false, so older mise would get a call it can't answer.
    if (auditSupported) audit.revalidate();
  }, [outdated.revalidate, audit.revalidate, auditSupported]);
  const refresh = useCallback(() => {
    revalidate();
    launchCommand({ name: "outdated-tools", type: LaunchType.Background }).catch(() => undefined);
  }, [revalidate]);

  useEffect(() => {
    if (!upgradeOnLaunch || launchHandled.current) return;
    launchHandled.current = true;
    const op = upgrade(upgradeOnLaunch === "all" ? undefined : upgradeOnLaunch, upgradeOptions(prefs, location));
    runOperation(location, op, refresh);
  }, [location, upgradeOnLaunch, refresh, prefs]);

  const tools = data?.tools ?? [];
  const unchecked = data?.unchecked ?? [];
  const vulnerable = auditSupported ? (audit.data ?? []) : [];
  const auditLoading = auditSupported && audit.isLoading;

  return (
    <List
      isLoading={outdated.isLoading || auditLoading || (!data && !outdated.error)}
      searchBarPlaceholder="Search outdated tools"
    >
      {outdated.error && !data ? (
        <LoadError error={outdated.error} retry={outdated.revalidate} />
      ) : (
        data &&
        !outdated.isLoading &&
        !auditLoading &&
        unchecked.length === 0 &&
        vulnerable.length === 0 && (
          <List.EmptyView icon={Icon.CheckCircle} title="All tools up to date" description="Nothing to upgrade" />
        )
      )}
      {/* Any item hides the EmptyView, which carries the load error and its Retry. */}
      {!(outdated.error && !data) && <MiseUpdateListItem location={location} />}
      {!(outdated.error && !data) && vulnerable.length > 0 && (
        <List.Section title="Vulnerable" subtitle={String(vulnerable.length)}>
          {vulnerable.map((item) => (
            <VulnerableItem
              key={`${item.tool}@${item.version}`}
              vulnerable={item}
              location={location}
              prefs={prefs}
              refresh={refresh}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
      {tools.length > 0 && (
        <List.Section title="Outdated" subtitle={String(tools.length)}>
          {tools.map((tool) => (
            <ToolItem
              key={tool.name}
              tool={tool}
              location={location}
              prefs={prefs}
              refresh={refresh}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
      {unchecked.length > 0 && (
        <List.Section title="Couldn't Check" subtitle={String(unchecked.length)}>
          {unchecked.map((tool) => (
            <List.Item
              key={`${tool.name}@${tool.version}`}
              icon={Icon.Warning}
              title={tool.name}
              subtitle={tool.version}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={outdated.revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ToolItem({
  tool,
  location,
  prefs,
  refresh,
  revalidate,
}: {
  tool: OutdatedTool;
  location: MiseLocation;
  prefs: MisePreferences;
  refresh: () => void;
  revalidate: () => void;
}) {
  const upgradeOne = upgrade(tool.name, upgradeOptions(prefs, location));
  const upgradeAll = upgrade(undefined, upgradeOptions(prefs, location));
  const version = "malformed" in tool ? undefined : tool;
  const accessories: List.Item.Accessory[] = [];
  if (version?.sourcePath) {
    if (version.requested !== "latest") accessories.push({ text: version.requested, tooltip: "Requested version" });
    accessories.push({ tag: basename(version.sourcePath) });
  }

  return (
    <List.Item
      title={tool.name}
      subtitle={outdatedVersions(tool)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Upgrade" icon={Icon.ArrowUp} onAction={() => runOperation(location, upgradeOne, refresh)} />
          <Action
            title="Upgrade All"
            icon={Icon.ArrowUpCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => runOperation(location, upgradeAll, refresh)}
          />
          <RunInTerminalAction command={miseCommandLine(location, upgradeOne)} />
          <RunInTerminalAction
            title="Upgrade All in Terminal"
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            command={miseCommandLine(location, upgradeAll)}
          />
          {version?.releaseUrl && <Action.OpenInBrowser title="Open Release Notes" url={version.releaseUrl} />}
          <Action.CopyToClipboard
            title="Copy Upgrade Command"
            content={miseCommandLine({ path: "mise" }, upgradeOne)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
