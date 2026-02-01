import {
  ActionPanel,
  Action,
  List,
  Form,
  Alert,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listSessions,
  buildAttachCommand,
  openInTerminal,
  renameSession,
  killSession,
} from "./tmux";

interface Preferences {
  mode: "local" | "ssh";
  sshHost: string;
  terminal: "ghostty" | "iterm";
  tmuxSocket?: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const {
    data: sessions,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => listSessions(prefs.mode, prefs.sshHost, prefs.tmuxSocket),
    [],
    {
      keepPreviousData: true,
    },
  );

  const attachToSession = async (session: string) => {
    try {
      const cmd = buildAttachCommand(
        session,
        prefs.mode,
        prefs.sshHost,
        prefs.tmuxSocket,
      );
      await openInTerminal(cmd, prefs.terminal);
      showToast({
        style: Toast.Style.Success,
        title: `Attaching to ${session}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open terminal",
        message: String(error),
      });
    }
  };

  const killSelectedSession = async (session: string) => {
    const confirmed = await confirmAlert({
      title: "Kill tmux session?",
      message: `This will terminate "${session}" and all its windows.`,
      primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Killing ${session}...`,
      });
      await killSession(session, prefs.mode, prefs.sshHost, prefs.tmuxSocket);
      showToast({ style: Toast.Style.Success, title: `Killed ${session}` });
      revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to kill session",
        message: String(error),
      });
    }
  };

  const createNewSession = async () => {
    const sessionName = `session-${Date.now()}`;
    await attachToSession(sessionName);
  };

  const modeLabel = prefs.mode === "ssh" ? `SSH (${prefs.sshHost})` : "Local";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      <List.Section title={`${modeLabel} Sessions`}>
        {sessions?.map((session) => (
          <List.Item
            key={session.name}
            icon={session.attached ? Icon.Circle : Icon.CircleDisabled}
            title={session.name}
            subtitle={`${session.windows} window${session.windows !== 1 ? "s" : ""}`}
            accessories={[
              ...(session.attached
                ? [{ tag: { value: "attached", color: "#4CAF50" } }]
                : []),
              ...(session.created ? [{ text: session.created }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Attach"
                  onAction={() => attachToSession(session.name)}
                  icon={Icon.Terminal}
                />
                <Action.Push
                  title="Rename Session"
                  icon={Icon.Pencil}
                  target={
                    <RenameSessionForm
                      session={session.name}
                      onRenamed={revalidate}
                    />
                  }
                />
                <Action
                  title="Kill Session"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => killSelectedSession(session.name)}
                />
                <Action
                  title="Refresh"
                  onAction={revalidate}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="New Session"
                  onAction={createNewSession}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {(!sessions || sessions.length === 0) && !isLoading && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No tmux sessions"
          description="Press ⌘N to create a new session"
          actions={
            <ActionPanel>
              <Action
                title="New Session"
                onAction={createNewSession}
                icon={Icon.Plus}
              />
              <Action
                title="Refresh"
                onAction={revalidate}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function RenameSessionForm(props: { session: string; onRenamed: () => void }) {
  const prefs = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    const newName = values.name.trim();
    if (!newName) {
      showToast({
        style: Toast.Style.Failure,
        title: "New session name is required",
      });
      return;
    }
    if (newName === props.session) {
      showToast({
        style: Toast.Style.Success,
        title: "Session name unchanged",
      });
      pop();
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: "Renaming session..." });
      await renameSession(
        props.session,
        newName,
        prefs.mode,
        prefs.sshHost,
        prefs.tmuxSocket,
      );
      showToast({ style: Toast.Style.Success, title: `Renamed to ${newName}` });
      props.onRenamed();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename session",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Session" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Name" defaultValue={props.session} />
    </Form>
  );
}
