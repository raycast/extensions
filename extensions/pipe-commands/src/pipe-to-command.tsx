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
import { useEffect, useState } from "react";
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
      {props.input.type == "file" ? (
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
      ) : null}
      {parsed?.commands
        .filter((command) => command.metadatas.argument1.type == props.input.type)
        .map((command) => (
          <PipeCommand key={command.path} command={command} input={props.input} onTrash={loadCommands} />
        ))}
    </List>
  );
}

export function getRaycastIcon(scriptIcon: string | undefined, defaultIcon: Image.ImageLike): Image.ImageLike {
  const icon = Icon[scriptIcon as keyof typeof Icon];
  return icon ? icon : defaultIcon;
}

export function PipeCommand(props: { command: ScriptCommand; input?: PipeInput; onTrash: () => void }) {
  const { command, input, onTrash } = props;
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
      showHUD(stderr ? `⚠️ ${stderr}` : `⚠️ Error: Process terminated with status ${status}`);
      return stdout;
    }

    return stdout;
  }

  return (
    <List.Item
      key={command.path}
      icon={getRaycastIcon(command.metadatas.icon, defaultIcon)}
      accessoryIcon={command.user ? Icon.Person : undefined}
      title={command.metadatas.title}
      subtitle={command.metadatas.packageName}
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
              <Action.OpenWith path={command.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action.ShowInFinder path={command.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
              <Action.Trash paths={command.path} onTrash={onTrash} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Text}
              title="Show Script Contents"
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              target={<Detail markdown={codeblock(command.content)} />}
            />
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
  const copyAction = (
    <Action
      title="Copy Script Output"
      icon={Icon.Clipboard}
      onAction={async () => {
        const output = await runCommand();
        if (output) Clipboard.copy(output);
        await closeMainWindow();
        await popToRoot();
      }}
    />
  );
  switch (mode) {
    case "silent":
      return (
        <Action
          icon={Icon.Terminal}
          title="Run Script"
          onAction={async () => {
            const output = await runCommand();
            if (output) showHUD(output);
            await closeMainWindow();
            await popToRoot();
          }}
        />
      );
    case "fullOutput":
      return (
        <Action.Push icon={Icon.Text} title="Show Script Output" target={<PipeDetails runCommand={runCommand} />} />
      );
    case "copy":
      return copyAction;
    case "replace":
      return origin == "clipboard" ? (
        copyAction
      ) : (
        <Action
          title="Paste Script Output"
          icon={Icon.Clipboard}
          onAction={async () => {
            const output = await runCommand();
            if (output) Clipboard.paste(output);
            await closeMainWindow();
            await popToRoot();
          }}
        />
      );
  }
}

function PipeDetails(props: { runCommand: () => Promise<string> }) {
  const [content, setContent] = useState<string>();
  useEffect(() => {
    props.runCommand().then(setContent);
  }, []);

  return (
    <Detail
      isLoading={typeof content == "undefined"}
      markdown={content ? codeblock(content) : undefined}
      actions={<ActionPanel>{content ? <Action.CopyToClipboard content={content} /> : null}</ActionPanel>}
    />
  );
}
