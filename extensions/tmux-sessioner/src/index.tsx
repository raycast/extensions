import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, useNavigation, launchCommand, LaunchType } from "@raycast/api";
import { RenameTmuxSession } from "./RenameTmuxSession";
import { deleteSession, getAllSession, switchToSession } from "./utils/sessionUtils";
import { checkTerminalSetup } from "./utils/terminalUtils";

export default function Command() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

  const { push } = useNavigation();

  const setupListSesssions = () => {
    getAllSession((error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setIsLoading(false);
        return;
      }

      const lines = stdout.trim().split("\n");

      if (lines?.length > 0) {
        setSessions(lines);
      }

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
        {sessions.map((session, index) => (
          <List.Item
            key={index}
            icon={Icon.Terminal}
            title={session}
            actions={
              <ActionPanel>
                <Action title="Switch to Selected Session" onAction={() => switchToSession(session, setIsLoading)} />
                <Action
                  title="Rename This Session"
                  onAction={() => {
                    push(<RenameTmuxSession session={session} callback={() => setupListSesssions()} />);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Delete This Session"
                  onAction={() =>
                    deleteSession(session, setIsLoading, () => setSessions(sessions.filter((s) => s !== session)))
                  }
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </>
  );
}
