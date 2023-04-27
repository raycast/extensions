import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, Toast, showToast, Detail } from "@raycast/api";
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
      toast.title = `Switched to session ${session}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Terminal not supported 😢";
    }
    return;
  });
}

export default function Command() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

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
                <Action title="Switch To Selected Session" onAction={() => switchToSession(session)} />
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
