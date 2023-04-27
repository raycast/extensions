import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, Toast, showToast } from "@raycast/api";
import { exec, execSync } from "child_process";
import { LocalStorage } from "@raycast/api";
import { SelectTerminalApp } from "./SelectTermnialApp";

const env = Object.assign({}, process.env, { PATH: "/usr/local/bin:/usr/bin:/opt/homebrew/bin" });

async function openTerminal() {
  const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppName");
  execSync(`open -a ${localTerminalAppName}`);
}

async function switchToSession(session: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Permission Checking" });

  exec(`tmux switch -t ${session}`, { env }, async (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);

      toast.style = Toast.Style.Failure;
      toast.title = "No tmux client found 😢";
      toast.message = error.message;

      return;
    }

    try {
      await openTerminal();

      toast.style = Toast.Style.Success;
      toast.title = "Switched to session 🎉";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Terminal not supported 😢";
    }
    return;
  });
}

export default function Command() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalAppName, setTerminalAppName] = useState<string>("");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppName");

      if (!localTerminalAppName) {
        setIsLoading(false);
        return;
      }

      // Set terminal App Name if not set
      if (!terminalAppName) {
        setTerminalAppName(localTerminalAppName);
      }

      // List down all tmux session
      exec(`tmux list-sessions | awk '{print $1}' | sed 's/://'`, { env }, (error, stdout, stderr) => {
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
    })();
  }, [terminalAppName]);

  if (!terminalAppName) {
    return <SelectTerminalApp setTerminalAppName={setTerminalAppName} />;
  }

  return (
    <List isLoading={isLoading}>
      {sessions.map((session, index) => (
        <List.Item
          key={index}
          icon={Icon.Terminal}
          title={session}
          actions={
            <ActionPanel>
              <Action title="Switch To Selected Session" onAction={() => switchToSession(session)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
