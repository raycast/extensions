import { Icon, List, Action, ActionPanel } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, getSessionWindows } from "./sesh";
import { checkSetup, isSetupError, renderSetupEmptyView } from "./setup";
import { getIcon } from "./sessions";
import { SessionWindowsSection, WindowList, useConnect } from "./windows";

export default function SearchCommand() {
  const { isConnecting, connectSession, connectWindow } = useConnect();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      await checkSetup();
      const sessions = (await getSessions()) ?? [];
      return { sessions, sessionWindows: await getSessionWindows(sessions) };
    },
    [],
    {
      keepPreviousData: true,
      onError: (error) => {
        if (isSetupError(error)) {
          return;
        }
        showFailureToast(error, { title: "Couldn't get sessions" });
      },
    },
  );
  const sessions = isSetupError(error) ? [] : (data?.sessions ?? []);
  const sessionWindows = isSetupError(error) ? [] : (data?.sessionWindows ?? []);

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={revalidate}
    />
  );

  function renderEmptyView() {
    const setupEmptyView = renderSetupEmptyView(error, refreshAction);
    if (setupEmptyView) {
      return setupEmptyView;
    }
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load sessions"
          description="Press ⌘R to retry."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      );
    }
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Nothing found"
        description="Press ⌘R to refresh."
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
    );
  }

  return (
    <List isLoading={isLoading || isConnecting} searchBarPlaceholder="Search sessions and windows">
      {renderEmptyView()}
      <List.Section title="Sessions">
        {sessions.map((session, index) => {
          const windowCount = session.TmuxWindows?.length ?? session.Windows;
          return (
            <List.Item
              key={index}
              title={session.Name}
              keywords={session.Alias ? [session.Alias] : undefined}
              icon={getIcon(session)}
              accessories={[
                ...(session.Alias ? [{ tag: session.Alias, tooltip: "Alias" }] : []),
                ...(session.Src === "tmux"
                  ? [
                      {
                        icon: Icon.AppWindow,
                        text: String(windowCount),
                        tooltip: windowCount === 1 ? "Window" : "Windows",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Connect to Session" onAction={() => connectSession(session.Name)} />
                  {session.Src === "tmux" && (
                    <Action.Push
                      title="Search Windows"
                      icon={Icon.AppWindowList}
                      target={<WindowList session={session.Name} />}
                    />
                  )}
                  {refreshAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {sessionWindows.map((session) => (
        <SessionWindowsSection
          key={session.name}
          session={session}
          onConnect={(window) => connectWindow(session.name, window, session.windows)}
          refreshAction={refreshAction}
        />
      ))}
    </List>
  );
}
