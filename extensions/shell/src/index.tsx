import { useEffect, useState } from "react";
import { ActionPanel, Detail, List, Action, Icon, closeMainWindow, popToRoot } from "@raycast/api";
import { shellHistory } from "shell-history";
import { shellEnv } from "shell-env";
import { exec, ChildProcess } from "child_process";
import { runAppleScript } from "run-applescript";
import { usePersistentState } from "raycast-toolkit";
import fs from "fs";
interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}
let cachedEnv: null | EnvType = null;

const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };
  return cachedEnv;
};

const Result = ({ cmd }: { cmd: string }) => {
  const [output, setOutput] = useState<string>("");
  const [finished, setFinished] = useState<boolean>(false);

  useEffect(() => {
    let killed = false;
    let child: ChildProcess | null = null;

    const runCommand = async () => {
      const execEnv = await getCachedEnv();
      child = exec(cmd, execEnv);
      child.stderr?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.stdout?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.on("exit", () => {
        if (killed) {
          return;
        }
        setFinished(true);
      });
    };
    runCommand();

    return function cleanup() {
      killed = true;
      if (child !== null) {
        child.kill("SIGTERM");
      }
    };
  }, [cmd, setOutput, setFinished]);

  return (
    <Detail
      markdown={"```\n$ " + cmd + " \n" + output + "\n```"}
      isLoading={!finished}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
};

const runInIterm = (command: string) => {
  const script = `
  tell application "iTerm2"
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "${command.replaceAll('"', '\\"')}"
    end tell
  end tell`;

  runAppleScript(script);
};

const runInTerminal = (command: string) => {
  const script = `
  tell application "Terminal"
    do script "${command.replaceAll('"', '\\"')}"
    activate
  end tell
  `;

  runAppleScript(script);
};

export default function Command() {
  const [cmd, setCmd] = useState<string>("");
  const [history, setHistory] = useState<string[]>();
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<string[]>("recently-used", []);
  const iTermInstalled = fs.existsSync("/Applications/iTerm.app");

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((list) => (list.find((x) => x === command) ? list : [command, ...list].slice(0, 10)));
  };

  useEffect(() => {
    setHistory([...new Set(shellHistory().reverse())] as string[]);
  }, [setHistory]);

  const categories = [];

  if (cmd) {
    categories.push({
      category: "New command",
      items: [cmd],
    });
  }

  if (recentlyUsed.length > 0) {
    categories.push({
      category: "Raycast History",
      items: recentlyUsed.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  if (history !== undefined && history.length > 0) {
    categories.push({
      category: "Bash History",
      items: history.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  return (
    <List
      isLoading={history === undefined}
      enableFiltering={false}
      onSearchTextChange={setCmd}
      navigationTitle="Shell command"
      searchBarPlaceholder="Enter shell-command"
    >
      {categories.map((category) => (
        <List.Section title={category.category} key={category.category}>
          {category.items.map((command, index) => (
            <List.Item
              icon={Icon.Terminal}
              title={command}
              key={index}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Execute"
                    icon={Icon.List}
                    onPush={() => addToRecentlyUsed(command)}
                    target={<Result cmd={command} />}
                  />
                  {iTermInstalled ? (
                    <Action
                      title="Execute in iTerm.app"
                      icon={Icon.Window}
                      onAction={() => {
                        closeMainWindow();
                        popToRoot();
                        addToRecentlyUsed(command);
                        runInIterm(command);
                      }}
                    />
                  ) : null}
                  <Action
                    title="Execute in Terminal.app"
                    icon={Icon.Window}
                    onAction={() => {
                      closeMainWindow();
                      popToRoot();
                      addToRecentlyUsed(command);
                      runInTerminal(command);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy to Clipboard"
                    content={command}
                    onCopy={() => {
                      addToRecentlyUsed(command);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
