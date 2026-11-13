import { Icon, List, Action, ActionPanel } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, getSessionWindows } from "./sesh";
import { checkSetup, isSetupError, renderSetupEmptyView } from "./setup";
import { SessionWindowsSection, useConnect } from "./windows";

export default function ConnectWindowCommand() {
  const { isConnecting, connectWindow } = useConnect();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      await checkSetup();
      const sessions = await getSessionWindows((await getSessions({ tmuxOnly: true })) ?? []);
      const failure = sessions.find((session) => session.error);
      if (failure && sessions.every((session) => session.error)) {
        throw new Error(failure.error);
      }
      return sessions;
    },
    [],
    {
      keepPreviousData: true,
      onError: (error) => {
        if (isSetupError(error)) {
          return;
        }
        showFailureToast(error, { title: "Couldn't get windows" });
      },
    },
  );
  const sessions = isSetupError(error) ? [] : (data ?? []);

  const refreshAction = (
    <Action
      title="Refresh Windows"
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
          title="Couldn't load windows"
          description="Press ⌘R to retry."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      );
    }
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No windows found"
        description="Press ⌘R to refresh."
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
    );
  }

  return (
    <List isLoading={isLoading || isConnecting} searchBarPlaceholder="Search windows or sessions">
      {renderEmptyView()}
      {sessions.map((session) => (
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
