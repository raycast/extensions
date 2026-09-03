import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { aerospace } from "./lib/config";
import { focusWindow, listWindows, listWorkspaces } from "./lib/workspaces";
import { ServerUnavailable } from "./serverState";

/**
 * Every open window, grouped by the workspace it lives on.
 *
 * Grouping matters more than it sounds. The reason to open this is usually "where did
 * that window go", and a flat list makes you read a workspace tag on every row to
 * answer it.
 */
export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const [windows, workspaces] = await Promise.all([listWindows(), listWorkspaces()]);
    return { windows, focused: workspaces.find((w) => w.isFocused)?.name };
  }, []);

  const windows = data?.windows ?? [];
  const order = [...new Set(windows.map((w) => w.workspace ?? "?"))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Focus a window…">
      {error && <ServerUnavailable error={error} onRecovered={revalidate} />}
      {!isLoading && !error && windows.length === 0 && <List.EmptyView icon={Icon.AppWindow} title="No open windows" />}

      {order.map((workspace) => (
        <List.Section
          key={workspace}
          title={`Workspace ${workspace}`}
          subtitle={workspace === data?.focused ? "current" : undefined}
        >
          {windows
            .filter((w) => (w.workspace ?? "?") === workspace)
            .map((w) => (
              <List.Item
                key={w.windowId}
                icon={{
                  source: Icon.AppWindow,
                  tintColor: workspace === data?.focused ? Color.Green : Color.SecondaryText,
                }}
                title={w.appName}
                subtitle={w.windowTitle}
                keywords={[w.windowTitle, workspace, String(w.windowId)]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Focus Window"
                        icon={Icon.Center}
                        onAction={() => run(() => focusWindow(w.windowId), "Couldn't focus that window", true)}
                      />
                      <Action
                        title="Pull to Current Workspace"
                        icon={Icon.ArrowDownCircle}
                        // Not cmd-P: Raycast reserves that for the search bar dropdown
                        // and silently ignores an extension that claims it.
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        onAction={() =>
                          run(async () => {
                            if (!data?.focused) throw new Error("No focused workspace to pull into.");
                            await aerospace("move-node-to-workspace", "--window-id", String(w.windowId), data.focused);
                            revalidate();
                          }, "Couldn't move that window")
                        }
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Set to Tiling"
                        icon={Icon.AppWindowGrid2x2}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() =>
                          run(async () => {
                            await aerospace("layout", "--window-id", String(w.windowId), "tiling");
                            revalidate();
                          }, "Couldn't tile that window")
                        }
                      />
                      <Action
                        title="Set to Floating"
                        icon={Icon.Move}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() =>
                          run(async () => {
                            await aerospace("layout", "--window-id", String(w.windowId), "floating");
                            revalidate();
                          }, "Couldn't float that window")
                        }
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

/** Focusing dismisses Raycast; the rest leave it open so you can act on another window. */
async function run(action: () => Promise<void>, failureTitle: string, dismiss = false) {
  try {
    await action();
    if (dismiss) await closeMainWindow();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
