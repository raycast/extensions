import { Action, ActionPanel, Icon, Keyboard, launchCommand, type LaunchProps, LaunchType, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MiseLocation } from "./mise/locate";
import { upgrade } from "./mise/operations";
import { listOutdated, outdatedSubtitle, type OutdatedTool } from "./mise/outdated";
import { miseCommandLine } from "./terminal/script";
import { LoadError, loadErrorInView } from "./ui/LoadError";
import { MissingMise } from "./ui/MissingMise";
import { outdatedOptions, readPreferences, upgradeOptions, type MisePreferences } from "./ui/preferences";
import { RunInTerminalAction } from "./ui/runInTerminal";
import { runOperation } from "./ui/runOperation";
import { useCommandSubtitle } from "./ui/useCommandSubtitle";
import { useMise } from "./ui/useMise";

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
  const outdated = useCachedPromise(listOutdated, [location, outdatedOptions(prefs)], loadErrorInView);
  const launchHandled = useRef(false);
  useCommandSubtitle(outdated.data && outdatedSubtitle(outdated.data.length));
  const refresh = useCallback(() => {
    outdated.revalidate();
    launchCommand({ name: "outdated-tools", type: LaunchType.Background }).catch(() => undefined);
  }, [outdated.revalidate]);

  useEffect(() => {
    if (!upgradeOnLaunch || launchHandled.current) return;
    launchHandled.current = true;
    const op = upgrade(upgradeOnLaunch === "all" ? undefined : upgradeOnLaunch, upgradeOptions(prefs));
    runOperation(location, op, refresh);
  }, [location, upgradeOnLaunch, refresh, prefs]);

  const tools = outdated.data ?? [];

  return (
    <List isLoading={outdated.isLoading} searchBarPlaceholder="Search outdated tools">
      {outdated.error && !outdated.data ? (
        <LoadError error={outdated.error} retry={outdated.revalidate} />
      ) : (
        !outdated.isLoading && (
          <List.EmptyView icon={Icon.CheckCircle} title="All tools up to date" description="Nothing to upgrade" />
        )
      )}
      {tools.map((tool) => (
        <ToolItem
          key={tool.name}
          tool={tool}
          location={location}
          prefs={prefs}
          refresh={refresh}
          revalidate={outdated.revalidate}
        />
      ))}
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
  const upgradeOne = upgrade(tool.name, upgradeOptions(prefs));
  const upgradeAll = upgrade(undefined, upgradeOptions(prefs));
  const accessories: List.Item.Accessory[] = [];
  if (tool.sourcePath) {
    if (tool.requested !== "latest") accessories.push({ text: tool.requested, tooltip: "Requested version" });
    accessories.push({ tag: basename(tool.sourcePath) });
  }

  return (
    <List.Item
      title={tool.name}
      subtitle={`${tool.current} → ${tool.latest}`}
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
          {tool.releaseUrl && <Action.OpenInBrowser title="Open Release Notes" url={tool.releaseUrl} />}
          <Action.CopyToClipboard title="Copy Upgrade Command" content={`mise upgrade ${tool.name}`} />
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
