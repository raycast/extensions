import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { RenameTmux } from "./RenameTmux";
import { KillSessionsList } from "./KillSessionsList";
import {
  deleteSession,
  getAllSessionsWithInfo,
  killSessions,
  openSessionInTerminal,
  switchToSession,
  type TmuxSession,
} from "./utils/sessionUtils";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { getTerminalCapabilities, type TerminalCapabilities } from "./utils/terminalLaunchUtils";

export default function Command() {
  const [sessions, setSessions] = useState<Array<TmuxSession>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);
  const [terminalCapabilities, setTerminalCapabilities] = useState<TerminalCapabilities | null>(null);

  const { push } = useNavigation();

  const numericSessions = sessions.filter((session) => /^\d+$/.test(session.name));

  const handleKillAllNumeric = async () => {
    const names = numericSessions.map((session) => session.name);

    const confirmed = await confirmAlert({
      title: `Kill ${names.length} numeric ${names.length === 1 ? "session" : "sessions"}?`,
      message: names.join(", "),
      primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "" });

    killSessions(names, (error, _stdout, stderr) => {
      if (error || stderr) {
        console.error(`exec error: ${error || stderr}`);

        toast.style = Toast.Style.Failure;
        toast.title = "Something went wrong 😢";
        toast.message = error ? error.message : stderr;
        setIsLoading(false);
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Killed ${names.length} numeric ${names.length === 1 ? "session" : "sessions"}`;
      setupListSesssions();
    });
  };

  const handleDeleteSession = async (session: TmuxSession) => {
    const confirmed = await confirmAlert({
      title: `Delete session ${session.name}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    deleteSession(session.name, setIsLoading, () => setSessions(sessions.filter((s) => s.name !== session.name)));
  };

  const setupListSesssions = () => {
    getAllSessionsWithInfo((error, sessions) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setIsLoading(false);
        return;
      }

      setSessions(sessions);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      const isSetup = await checkTerminalSetup(setIsTerminalSetup);

      if (!isSetup) {
        setIsLoading(false);
        return;
      }

      setTerminalCapabilities(await getTerminalCapabilities());
    })();
  }, []);

  useEffect(() => {
    if (!isTerminalSetup) {
      return;
    }

    // List down all tmux session
    setIsLoading(true);
    setupListSesssions();
  }, [isTerminalSetup]);

  useEffect(() => {
    if (!isTerminalSetup && !isLoading) {
      launchCommand({
        type: LaunchType.UserInitiated,
        name: "choose_terminal_app",
        extensionName: "tmux-sessioner",
        ownerOrAuthorName: "louishuyng",
        context: { launcherCommand: "index" },
      });
    }
  }, [isTerminalSetup, isLoading]);

  return (
    <>
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Tmux Sessions"
          description="Create one with the Create New Session command, or start tmux in your terminal."
        />
        {sessions.map((session) => (
          <List.Item
            key={session.name}
            icon={Icon.Terminal}
            title={session.name}
            accessories={[
              ...(session.attached ? [{ icon: Icon.Link, tooltip: "Attached" }] : []),
              { text: `${session.windows} ${session.windows === 1 ? "window" : "windows"}` },
              { date: session.lastActivity, tooltip: "Last activity" },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Switch to Selected Session"
                    onAction={() => switchToSession(session.name, setIsLoading)}
                  />
                  {terminalCapabilities?.supportsTab && (
                    <Action
                      title="Open in New Tab"
                      icon={Icon.PlusSquare}
                      onAction={() => openSessionInTerminal(session.name, "tab", setIsLoading)}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                    />
                  )}
                  {terminalCapabilities?.supportsWindow && (
                    <Action
                      title="Open in New Window"
                      icon={Icon.NewDocument}
                      onAction={() => openSessionInTerminal(session.name, "window", setIsLoading)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                  )}
                  <Action
                    title="Rename This Session"
                    onAction={() => {
                      push(
                        <RenameTmux
                          sessionName={session.name}
                          windowName=""
                          type="Session"
                          callback={() => setupListSesssions()}
                        />,
                      );
                    }}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete This Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteSession(session)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "x" }}
                  />
                  <Action
                    title="Kill Multiple Sessions"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      push(<KillSessionsList sessions={sessions} callback={() => setupListSesssions()} />);
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  />
                  {numericSessions.length > 0 && (
                    <Action
                      title="Kill All Numeric Sessions"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={handleKillAllNumeric}
                      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "x" }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List>
    </>
  );
}
