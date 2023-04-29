import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, Toast, showToast, Detail, useNavigation } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { SelectTerminalApp } from "./SelectTermnialApp";
import { deleteSession, getAllSession, switchToSession } from "./sessionUtils";
import { RenameTmuxSession } from "./RenameTmuxSession";

export default function Command() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

  const { push } = useNavigation();
  async function checkTerminalSetup(): Promise<boolean> {
    const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppName");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking terminal App setup",
    });

    if (!localTerminalAppName) {
      toast.style = Toast.Style.Failure;
      toast.title = "No default terminal setup for tmux sessioner";
      setIsTerminalSetup(false);

      return false;
    } else {
      toast.hide();
      setIsTerminalSetup(true);

      return true;
    }
  }

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

      const isSetup = await checkTerminalSetup();

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
                <Action title="Switch To Selected Session" onAction={() => switchToSession(session, setIsLoading)} />
                <Action
                  title="Delete This Session"
                  onAction={() =>
                    deleteSession(session, setIsLoading, () => setSessions(sessions.filter((s) => s !== session)))
                  }
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action
                  title="Rename This Session"
                  onAction={() => {
                    push(<RenameTmuxSession session={session} callback={() => setupListSesssions()} />);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>

      {!isTerminalSetup && !isLoading && (
        <Detail
          markdown="**Setup Default Terminal App Before Usage** `Go to Actions or using Cmd + k`"
          actions={
            <ActionPanel>
              <Action.Push title="Setup Here" target={<SelectTerminalApp setIsTerminalSetup={setIsTerminalSetup} />} />
            </ActionPanel>
          }
        />
      )}
    </>
  );
}
