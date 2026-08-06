import { Action, ActionPanel, Alert, Icon, List, closeMainWindow, confirmAlert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSessions, runHerdr } from "./lib/herdr";
import { launchHerdrInTerminal } from "./lib/terminal";
import { ErrorView, runAction, shortcuts } from "./lib/ui";

export default function Command() {
  const sessions = useCachedPromise(getSessions, [], { keepPreviousData: true });
  if (sessions.error && !sessions.data) return <ErrorView error={sessions.error} onRetry={sessions.revalidate} />;

  async function stop(name: string) {
    if (
      !(await confirmAlert({
        title: `Stop session “${name}”?`,
        message: "Every workspace, pane, agent, and running process in this session will stop.",
        primaryAction: { title: "Stop Session", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await runAction(
      "Stopping session",
      () => runHerdr(["session", "stop", name, "--json"], { session: "" }).then(() => undefined),
      {
        success: "Session Stopped",
        onSuccess: sessions.revalidate,
      },
    );
  }

  async function remove(name: string) {
    if (
      !(await confirmAlert({
        title: `Delete session “${name}”?`,
        message: "This deletes the persisted session state. The session must be stopped first.",
        primaryAction: { title: "Delete Session", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await runAction(
      "Deleting session",
      () => runHerdr(["session", "delete", name, "--json"], { session: "" }).then(() => undefined),
      {
        success: "Session Deleted",
        onSuccess: sessions.revalidate,
      },
    );
  }

  return (
    <List isLoading={sessions.isLoading} searchBarPlaceholder="Search Herdr sessions…">
      <List.EmptyView
        icon={Icon.Terminal}
        title="No Sessions"
        description="Open Herdr to create the default session."
      />
      {(sessions.data || []).map((session) => (
        <List.Item
          key={session.name}
          icon={session.running ? { source: Icon.CircleFilled, tintColor: "#34C759" } : Icon.Circle}
          title={session.name}
          subtitle={session.session_dir}
          accessories={[
            { tag: session.running ? "Running" : "Stopped" },
            ...(session.default ? [{ tag: "Default" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={session.running ? "Attach in Terminal" : "Start and Attach in Terminal"}
                icon={Icon.Terminal}
                onAction={async () => {
                  const succeeded = await runAction(
                    "Opening session",
                    () =>
                      launchHerdrInTerminal(["session", "attach", session.name], { includePreferredSession: false }),
                    { success: "Terminal Opened" },
                  );
                  if (succeeded) await closeMainWindow({ clearRootSearch: true });
                }}
              />
              {session.running ? (
                <Action
                  title="Stop Session"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={shortcuts.delete}
                  onAction={() => stop(session.name)}
                />
              ) : (
                <Action
                  title="Delete Session"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={shortcuts.delete}
                  onAction={() => remove(session.name)}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Socket Path"
                content={session.socket_path}
                shortcut={shortcuts.copyId}
              />
              <Action.ShowInFinder path={session.session_dir} shortcut={shortcuts.copyPath} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={shortcuts.refresh}
                onAction={sessions.revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
