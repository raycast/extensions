import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { destroySession, listSessions, renameSession, selectSession } from "./lib/rex";
import { NewSessionForm } from "./new-session-form";
import { type RenameSessionHandler, RenameSessionForm } from "./rename-session-form";
import type { RexSession } from "./types";

export default function Sessions() {
  const { push } = useNavigation();
  const { data, error, isLoading, revalidate } = useCachedPromise(listSessions, [], {
    keepPreviousData: true,
  });

  const openSession = async (session: RexSession) => {
    try {
      await selectSession(undefined, session.session_id);
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (openError) {
      await showFailureToast(openError, { title: "Could Not Open Session" });
    }
  };

  const closeSession = async (session: RexSession) => {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `Close “${session.label}”?`,
      message:
        "This destroys the session and closes all of its terminal blocks, terminating any programs running in them.",
      primaryAction: {
        title: "Close Session",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await destroySession(session.session_id);
      await revalidate();
    } catch (closeError) {
      await showFailureToast(closeError, { title: "Could Not Close Session" });
    }
  };

  const newSession = () => {
    push(<NewSessionForm onSessionCreated={revalidate} />);
  };

  const startRenameSession = (session: RexSession) => {
    const onRename: RenameSessionHandler = (label) => renameSession(session.session_id, label);
    push(<RenameSessionForm currentLabel={session.label} onRename={onRename} onSessionRenamed={revalidate} />);
  };

  const newSessionAction = (
    <Action
      title="New Session"
      icon={Icon.Plus}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "n" },
        Windows: { modifiers: ["ctrl", "shift"], key: "n" },
      }}
      onAction={newSession}
    />
  );

  const emptyViewActions = (
    <ActionPanel>
      {newSessionAction}
      <Action title="Refresh Sessions" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Rex sessions">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Rex Sessions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <ActionPanel.Section>{newSessionAction}</ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Rex Sessions"
          description="Create a session to get started."
          actions={emptyViewActions}
        />
      ) : (
        data?.map((session) => (
          <List.Item
            key={session.session_id}
            title={session.label}
            icon={{ source: "rex-session.svg", tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <Action title="Open Session" icon={Icon.ArrowRight} onAction={() => openSession(session)} />
                <ActionPanel.Section>
                  <Action
                    title="Rename Session"
                    icon={Icon.Pencil}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "e" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                    }}
                    onAction={() => startRenameSession(session)}
                  />
                  {newSessionAction}
                  <Action title="Refresh Sessions" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Close Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => closeSession(session)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
