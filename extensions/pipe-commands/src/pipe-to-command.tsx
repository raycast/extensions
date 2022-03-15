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
} from "@raycast/api";
import { spawnSync } from "child_process";
import { chmodSync } from "fs";
import { dirname } from "path";
import { useEffect, useState } from "react";
import { ScriptCommand } from "./types";
import { codeblock, parseScriptCommands, sortByAccessTime } from "./utils";

type InputType = "selection" | "clipboard";

export function PipeCommands(props: { inputFrom?: InputType }): JSX.Element {
  const { inputFrom } = props;
  const [parsed, setParsed] = useState<{ commands: ScriptCommand[] }>();

  const loadCommands = async () => {
    const { commands } = await parseScriptCommands();
    setParsed({ commands: await sortByAccessTime(commands) });
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof parsed == "undefined"} searchBarPlaceholder={`Pipe ${inputFrom} to`}>
      {parsed?.commands.map((command) => (
        <PipeCommand key={command.path} command={command} inputFrom={inputFrom} onTrash={loadCommands} />
      ))}
    </List>
  );
}

export function getRaycastIcon(scriptIcon: string | undefined, defaultIcon: Image.ImageLike): Image.ImageLike {
  const icon = Icon[scriptIcon as keyof typeof Icon];
  return icon ? icon : defaultIcon;
}

async function getInput(inputType: string) {
  if (inputType == "clipboard") {
    const clipboard = await Clipboard.readText();
    if (!clipboard) {
      throw new Error("No text in clipboard");
    }
    return clipboard;
  } else {
    return getSelectedText();
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
      icon={getRaycastIcon(command.metadatas.icon, Icon.Text)}
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

function CommandAction(props: { command: ScriptCommand; inputFrom: "clipboard" | "selection" }) {
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
  }
}
