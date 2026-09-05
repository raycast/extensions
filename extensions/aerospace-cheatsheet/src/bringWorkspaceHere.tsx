import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  focusedMonitor,
  listMonitors,
  listWindows,
  listWorkspaces,
  moveWorkspaceToMonitor,
  workspaceMonitors,
} from "./lib/workspaces";
import { ServerUnavailable } from "./serverState";

/**
 * Pull a workspace onto the display you are looking at.
 *
 * On a single display this cannot do anything, so it says so rather than presenting a
 * list of workspaces that are all already here.
 */
export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const [monitors, here, workspaces, windows, placement] = await Promise.all([
      listMonitors(),
      focusedMonitor(),
      listWorkspaces(),
      listWindows(),
      workspaceMonitors(),
    ]);
    return { monitors, here, workspaces, windows, placement };
  }, []);

  const singleMonitor = !isLoading && (data?.monitors.length ?? 0) < 2;
  const here = data?.here;

  // Empty workspaces are deliberately excluded. There is nothing to summon, and
  // because a monitor shows exactly one workspace at a time, bringing an empty one
  // over hides whatever you were looking at: the windows appear to vanish, and
  // AeroSpace auto-creates a replacement workspace on the display it left, so the
  // numbering ratchets up on every use. Found by doing exactly that on a real setup.
  const elsewhere = (data?.workspaces ?? []).filter(
    (w) => here && !w.isEmpty && data?.placement[w.name] !== undefined && data.placement[w.name] !== here.id,
  );

  /** Distinguishes "nothing is elsewhere" from "what is elsewhere is empty". */
  const emptyElsewhere = (data?.workspaces ?? []).some(
    (w) => here && w.isEmpty && data?.placement[w.name] !== undefined && data.placement[w.name] !== here.id,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Bring a workspace to this display…">
      {error && <ServerUnavailable error={error} onRecovered={revalidate} />}

      {singleMonitor && !error && (
        <List.EmptyView
          icon={Icon.Desktop}
          title="Only one display"
          description="Every workspace is already on this screen. This command earns its place once a second display is connected."
        />
      )}

      {!singleMonitor && !error && elsewhere.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Check}
          title="Nothing to bring over"
          description={
            emptyElsewhere
              ? `The other display only has empty workspaces. Bringing one over would just hide what is on ${here?.name ?? "this display"}.`
              : `Every workspace with windows on it is already on ${here?.name ?? "this display"}.`
          }
        />
      )}

      {!singleMonitor &&
        elsewhere.map((w) => {
          const apps = [...new Set((data?.windows ?? []).filter((x) => x.workspace === w.name).map((x) => x.appName))];
          const onMonitor = data?.monitors.find((m) => m.id === data?.placement[w.name]);
          return (
            <List.Item
              key={w.name}
              icon={{ source: Icon.Desktop, tintColor: Color.Blue }}
              title={w.name}
              subtitle={apps.join(", ")}
              keywords={[...apps, onMonitor?.name ?? ""]}
              accessories={onMonitor ? [{ text: onMonitor.name }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Bring to This Display"
                    icon={Icon.ArrowDownCircle}
                    onAction={async () => {
                      try {
                        if (!here) throw new Error("No focused display.");
                        await moveWorkspaceToMonitor(w.name, here.id);
                        revalidate();
                        await closeMainWindow();
                        await showHUD(`Workspace ${w.name} moved to ${here.name}`);
                      } catch (e) {
                        await showHUD(`Couldn't move it: ${e instanceof Error ? e.message : String(e)}`);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
