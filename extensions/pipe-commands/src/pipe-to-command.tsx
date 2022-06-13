import {
  ActionPanel,
  Icon,
  List,
  Clipboard,
  Toast,
  Action,
  showHUD,
  showToast,
  useNavigation,
  Image,
  Detail,
  closeMainWindow,
  popToRoot,
  getSelectedText,
  environment,
  getSelectedFinderItems,
} from "@raycast/api";
import { spawnSync } from "child_process";
import { chmodSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { useEffect, useState } from "react";
import { ScriptCommand } from "./types";
import { codeblock, parseScriptCommands, sortByAccessTime } from "./utils";

type InputType = "selection" | "clipboard" | "finder";

export function PipeCommands(props: { inputFrom?: InputType }): JSX.Element {
  const { inputFrom } = props;
  const [commands, setCommands] = useState<ScriptCommand[]>();

  const loadCommands = async () => {
    let { commands } = await parseScriptCommands();
    if (inputFrom === "finder") {
      commands = commands.filter((command) => command.metadatas.argument1.type == "file");
    } else {
      commands = commands.filter((command) => command.metadatas.argument1.type == "text");
    }
    setCommands(await sortByAccessTime(commands));
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof commands == "undefined"} searchBarPlaceholder={`Pipe ${inputFrom} to`}>
      {commands?.map((command) => (
        <PipeCommand key={command.path} command={command} inputFrom={inputFrom} onTrash={loadCommands} />
      ))}
    </List>
  );
}

export function getRaycastIcon(
  icon: string,
  iconDark: string | undefined,
  scriptPath: string
): Image.ImageLike | undefined {
  const buildIcon = (icon: string) => {
    if (icon.startsWith("http") || icon.startsWith("https")) {
      return { source: icon };
    }
    const iconPath = resolve(dirname(scriptPath), icon);
    if (existsSync(iconPath)) {
      return { source: iconPath };
    }
    return icon;
  };
  if (environment.theme === "dark" && iconDark) {
    return buildIcon(iconDark);
  }
  return buildIcon(icon);
}

async function getInput(inputType: InputType) {
  switch (inputType) {
    case "clipboard": {
      const clipboard = await Clipboard.readText();
      if (!clipboard) {
        throw new Error("No text in clipboard");
      }
      return clipboard;
    }
    case "selection":
      return getSelectedText();
    case "finder": {
      const items = await getSelectedFinderItems();
      if (!items || !items.length) {
        throw new Error("No items selected in finder");
      }
      return items.map((item) => item.path).join(":");
    }
  }
}

export function PipeCommand(props: {
  command: ScriptCommand;
  inputFrom?: InputType;
  onTrash: () => void;
  showContent?: boolean;
}): JSX.Element {
  const { command, inputFrom, onTrash, showContent } = props;

  return (
    <List.Item
      key={command.path}
      icon={
        command.metadatas.icon ? getRaycastIcon(command.metadatas.icon, command.metadatas.iconDark, command.path) : "➡️"
      }
      accessoryIcon={command.user ? Icon.Person : undefined}
      title={command.metadatas.title}
      subtitle={showContent ? undefined : command.metadatas.packageName}
      detail={
        showContent ? <List.Item.Detail markdown={["## Content", codeblock(command.content)].join("\n")} /> : undefined
      }
      actions={
        <ActionPanel>
          {typeof inputFrom != "undefined" ? (
            <ActionPanel.Section>
              <CommandAction command={command} inputFrom={inputFrom} />
            </ActionPanel.Section>
          ) : null}
          {command.user ? (
            <ActionPanel.Section>
              <Action.Open title="Open Command" target={command.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action.OpenWith path={command.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
              <Action.ShowInFinder path={command.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
              <Action.Trash paths={command.path} onTrash={onTrash} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Script Contents"
              shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
              content={command.content}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
async function runCommand(command: ScriptCommand, inputType: InputType) {
  const toast = await showToast(Toast.Style.Animated, "Running...");
  const input = await getInput(inputType);
  const argument1 = command.metadatas.argument1.percentEncoded ? encodeURIComponent(input) : input;
  chmodSync(command.path, "755");
  // Pass the input both to the command stdin and as command fist argument
  const { stdout, stderr, status } = spawnSync(command.path, [argument1], {
    encoding: "utf-8",
    cwd: command.metadatas.currentDirectoryPath ? command.metadatas.currentDirectoryPath : dirname(command.path),
    env: {
      PATH: "/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin",
    },
    maxBuffer: 10 * 1024 * 1024,
  });
  toast.hide();
  if (status !== 0) {
    throw new Error(stderr ? `⚠️ ${stderr}` : `⚠️ Process terminated with status ${status}`);
  }

  return stdout;
}

function CommandAction(props: { command: ScriptCommand; inputFrom: InputType }) {
  const { command, inputFrom } = props;
  const navigation = useNavigation();

  function outputHandler(onSuccess: (output: string) => void, exitOnSuccess?: boolean) {
    return async () => {
      try {
        const output = await runCommand(command, inputFrom);
        if (output) await onSuccess(output);
        if (exitOnSuccess) {
          await closeMainWindow();
          await popToRoot();
        }
      } catch (e) {
        const toast = await showToast({
          title: "An error occured",
          primaryAction: {
            title: "Copy Error Message",
            onAction: async () => {
              await Clipboard.copy((e as Error).message);
              await toast.hide();
            },
          },
          message: (e as Error).message,
          style: Toast.Style.Failure,
        });
      }
    };
  }

  const copyAction = (
    <Action title="Copy Script Output" icon={Icon.Clipboard} onAction={outputHandler(Clipboard.copy, true)} />
  );
  switch (command.metadatas.mode) {
    case "silent":
      return <Action icon={Icon.Terminal} title="Run Script" onAction={outputHandler(showHUD, true)} />;
    case "fullOutput":
      return (
        <Action
          icon={Icon.Text}
          title="Show Script Output"
          onAction={outputHandler(async (output) => {
            await navigation.push(
              <Detail
                markdown={codeblock(output)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={output} />
                  </ActionPanel>
                }
              />
            );
          })}
        />
      );
    case "copy":
      return copyAction;
    case "replace":
      return inputFrom == "clipboard" ? (
        copyAction
      ) : (
        <Action title="Paste Script Output" icon={Icon.Clipboard} onAction={outputHandler(Clipboard.paste, true)} />
      );
    case "compact":
      return (
        <Action
          title="Show Script Output"
          onAction={outputHandler(async (output) => {
            await popToRoot();
            await showToast({
              style: Toast.Style.Success,
              title: "Script finished running",
              message: output,
              primaryAction: {
                title: "Copy Script Output",
                onAction: async (toast) => {
                  await Clipboard.copy(output);
                  toast.title = "Copied to clipboard";
                },
              },
            });
          })}
        />
      );
  }
}
