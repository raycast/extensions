import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ERROR_IN_VIEW, OpenLancettaAction, RefreshAction } from "./lib/actions";
import { formatBytes, ProcessTree, scanProcesses } from "./lib/processes";
import { folderName } from "./lib/snapshot";

export default function Command() {
  const { data: trees, isLoading, error, revalidate } = usePromise(scanProcesses, [], ERROR_IN_VIEW);

  const orphans = (trees ?? []).filter((t) => t.orphan);
  const live = (trees ?? []).filter((t) => !t.orphan);
  const total = (list: ProcessTree[]) => formatBytes(list.reduce((sum, t) => sum + t.bytes, 0));

  const actions = (tree?: ProcessTree) => (
    <ActionPanel>
      {tree?.orphan && (
        // the app reads each argv exactly and checks the table again before it signals
        <OpenLancettaAction title="Reclaim in Lancetta" icon={Icon.Trash} />
      )}
      {tree?.cwd && !tree.orphan && <Action.ShowInFinder title="Show Folder in Finder" path={tree.cwd} />}
      {tree && <Action.CopyToClipboard title="Copy Broker PID" content={String(tree.broker)} />}
      {tree?.cwd && (
        <Action.CopyToClipboard
          title="Copy Folder Path"
          content={tree.cwd}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      )}
      <OpenLancettaAction />
      <RefreshAction onRefresh={revalidate} />
    </ActionPanel>
  );

  const item = (tree: ProcessTree) => (
    <List.Item
      key={tree.broker}
      icon={
        tree.orphan
          ? { source: Icon.Warning, tintColor: Color.Orange }
          : { source: Icon.Terminal, tintColor: tree.cwd ? Color.Green : Color.SecondaryText }
      }
      title={folderName(tree.cwd) ?? "Unknown folder"}
      subtitle={tree.cwd ?? undefined}
      accessories={[
        { text: `${tree.children.length} child${tree.children.length === 1 ? "" : "ren"}` },
        { tag: { value: formatBytes(tree.bytes), color: tree.orphan ? Color.Orange : Color.SecondaryText } },
      ]}
      actions={actions(tree)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by folder">
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Read the Process Table"
          description={error.message}
          actions={
            <ActionPanel>
              <RefreshAction onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {!error && !isLoading && (trees ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Codex Process Trees"
          description="No app-server-broker is running: nothing is holding memory for Codex."
          actions={actions()}
        />
      )}
      {orphans.length > 0 && (
        <List.Section title="Orphaned" subtitle={`${orphans.length} · ${total(orphans)} · their folder is gone`}>
          {orphans.map(item)}
        </List.Section>
      )}
      {live.length > 0 && (
        <List.Section title="Running" subtitle={`${live.length} · ${total(live)}`}>
          {live.map(item)}
        </List.Section>
      )}
    </List>
  );
}
