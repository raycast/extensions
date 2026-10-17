import { Icon, List, Action, ActionPanel, Color } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, getWindows } from "./sesh";
import { checkSetup, isSetupError, renderSetupEmptyView } from "./setup";
import { WindowItem, useWindowConnect } from "./windows";

export default function ConnectWindowCommand() {
  const { isConnecting, connect } = useWindowConnect();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      await checkSetup();
      const sessions = (await getSessions({ tmuxOnly: true })) ?? [];
      const results = await Promise.allSettled(sessions.map((session) => getWindows(session.Name)));
      const failure = results.find((result) => result.status === "rejected");
      if (failure && results.every((result) => result.status === "rejected")) {
        throw failure.reason;
      }
      return sessions.map((session, i) => {
        const result = results[i];
        return result.status === "fulfilled"
          ? { name: session.Name, windows: result.value, error: undefined }
          : { name: session.Name, windows: [], error: String(result.reason) };
      });
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
        <List.Section key={session.name} title={session.name}>
          {session.error && (
            <List.Item
              title="Couldn't load windows"
              subtitle={session.error}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              keywords={[session.name]}
              actions={<ActionPanel>{refreshAction}</ActionPanel>}
            />
          )}
          {session.windows.map((window) => (
            <WindowItem
              key={window.Index}
              window={window}
              keywords={[session.name]}
              onConnect={() => connect(session.name, window, session.windows)}
              refreshAction={refreshAction}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
