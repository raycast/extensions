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
} from "@raycast/api";
import { spawnSync } from "child_process";
import { chmodSync } from "fs";
import { dirname } from "path";
import { Fragment, useEffect, useState } from "react";
import { ArgumentType, ScriptCommand, ScriptMode } from "./types";
import { codeblock, parseScriptCommands, sortByAccessTime } from "./utils";

export interface PipeInput {
  type: ArgumentType;
  content: string;
  origin: "clipboard" | "selection";
}

export function PipeCommands(props: { input: PipeInput }): JSX.Element {
  const [parsed, setParsed] = useState<{ commands: ScriptCommand[] }>();

  const loadCommands = async () => {
    const { commands } = await parseScriptCommands();
    setParsed({ commands: await sortByAccessTime(commands) });
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof parsed == "undefined"} searchBarPlaceholder={`Pipe ${props.input.type} to`}>
      <List.Section title="Pipe Commands">
        {parsed?.commands
          .filter((command) => command.metadatas.argument1.type == props.input.type)
          .map((command) => (
            <PipeCommand key={command.path} command={command} input={props.input} onTrash={loadCommands} />
          ))}
      </List.Section>
      <List.Section title="Raycast Actions">
        {props.input.type == "file" ? (
          <Fragment>
            <List.Item
              icon={Icon.Finder}
              title="Open File"
              subtitle="File Actions"
              actions={
                <ActionPanel>
                  <Action.Open title="Open File" target={props.input.content} />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Document}
              title="Open With..."
              subtitle="File Actions"
              actions={
                <ActionPanel>
                  <Action.OpenWith path={props.input.content} />
                </ActionPanel>
              }
            />
          </Fragment>
        ) : (
          <Fragment>
            <List.Item
              icon={Icon.TextDocument}
              title="Create Snippet..."
              subtitle="Text Actions"
              actions={
                <ActionPanel>
                  <Action.CreateSnippet snippet={{ text: props.input.content }} />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Link}
              title="Create Quickink..."
              subtitle="Text Actions"
              actions={
                <ActionPanel>
                  <Action.CreateQuicklink quicklink={{ link: props.input.content }} />
                </ActionPanel>
              }
            />
          </Fragment>
        )}
      </List.Section>
    </List>
  );
}

export function getRaycastIcon(scriptIcon: string | undefined, defaultIcon: Image.ImageLike): Image.ImageLike {
  const icon = Icon[scriptIcon as keyof typeof Icon];
  return icon ? icon : defaultIcon;
}

export function PipeCommand(props: {
  command: ScriptCommand;
  input?: PipeInput;
  onTrash: () => void;
  showContent?: boolean;
}): JSX.Element {
  const { command, input, onTrash, showContent } = props;
  const defaultIcon = command.metadatas.argument1.type == "file" ? Icon.Document : Icon.Text;
  const navigation = useNavigation();

  async function runCommand(input: PipeInput) {
    const toast = await showToast(Toast.Style.Animated, "Running...");
    const argument1 = command.metadatas.argument1.percentEncoded ? encodeURIComponent(input.content) : input.content;
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

  return (
    <List.Item
      key={command.path}
      icon={getRaycastIcon(command.metadatas.icon, defaultIcon)}
      accessoryIcon={command.user ? Icon.Person : undefined}
      title={command.metadatas.title}
      subtitle={showContent ? undefined : command.metadatas.packageName}
      detail={
        showContent ? <List.Item.Detail markdown={["## Content", codeblock(command.content)].join("\n")} /> : undefined
      }
      actions={
        <ActionPanel>
          {typeof input != "undefined" ? (
            <ActionPanel.Section>
              <CommandAction mode={command.metadatas.mode} runCommand={() => runCommand(input)} origin={input.origin} />
              {command.metadatas.mode != "silent" ? (
                <Action
                  title="Pipe Script Output"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    const output = await runCommand(input);
                    navigation.push(<PipeCommands input={{ type: "text", content: output, origin: input.origin }} />);
                  }}
                />
              ) : null}
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

function CommandAction(props: {
  mode: ScriptMode;
  runCommand: () => Promise<string>;
  origin: "clipboard" | "selection";
}) {
  const { mode, runCommand, origin } = props;
  const navigation = useNavigation();

  function outputHandler(onOutput: (output: string) => void, exit?: boolean) {
    return async () => {
      try {
        const output = await runCommand();
        if (output) await onOutput(output);
        if (exit) {
          await closeMainWindow();
          await popToRoot();
        }
      } catch (e) {
        navigation.push(<Detail markdown={["## An error occurred!", codeblock((e as Error).message)].join("\n")} />);
      }
    };
  }

  const copyAction = (
    <Action title="Copy Script Output" icon={Icon.Clipboard} onAction={outputHandler(Clipboard.copy, true)} />
  );
  switch (mode) {
    case "silent":
      return <Action icon={Icon.Terminal} title="Run Script" onAction={outputHandler(showHUD, true)} />;
    case "fullOutput":
      return (
        <Action
          icon={Icon.Text}
          title="Show Script Output"
          onAction={outputHandler(async (output) => {
            await navigation.push(<Detail markdown={codeblock(output)} />);
          })}
        />
      );
    case "copy":
      return copyAction;
    case "replace":
      return origin == "clipboard" ? (
        copyAction
      ) : (
        <Action title="Paste Script Output" icon={Icon.Clipboard} onAction={outputHandler(Clipboard.paste, true)} />
      );
  }
}
