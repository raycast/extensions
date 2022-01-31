import {
  ActionPanel,
  closeMainWindow,
  copyTextToClipboard,
  environment,
  Icon,
  List,
  OpenAction,
  OpenWithAction,
  pasteText,
  PushAction,
  showHUD,
  ShowInFinderAction,
  showToast,
  ToastStyle,
  TrashAction,
  useNavigation,
} from "@raycast/api";
import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import { basename } from "path";
import { useEffect, useState } from "react";
import PipeCommandForm from "./create-pipe-command";
import { ArgumentType, ScriptCommand } from "./types";
import { copyAssetsCommands, parseScriptCommands, sortByAccessTime } from "./utils";

export interface PipeInput {
  type: ArgumentType;
  content: string;
}

export function PipeCommands(props: { input: PipeInput }): JSX.Element {
  const [parsed, setParsed] = useState<{ commands: ScriptCommand[]; invalid: string[] }>();

  const loadCommands = async () => {
    if (readdirSync(environment.supportPath).length == 0) {
      await copyAssetsCommands();
    }
    const { commands, invalid } = await parseScriptCommands(environment.supportPath);
    setParsed({ commands: await sortByAccessTime(commands), invalid });
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof parsed == "undefined"} searchBarPlaceholder="Pipe Input to...">
      {props.input.type == "file" ? (
        <List.Item
          icon={Icon.Document}
          title="Open With"
          actions={
            <ActionPanel>
              <OpenWithAction path={props.input.content} />
            </ActionPanel>
          }
        />
      ) : null}
      {parsed?.commands
        .filter((command) => command.metadatas.input.type == props.input.type)
        .map((command) => (
          <PipeCommand key={command.path} command={command} input={props.input} reload={loadCommands} />
        ))}
      {parsed?.invalid.map((path) => (
        <List.Item
          key={path}
          icon={Icon.ExclamationMark}
          title="Invalid Pipe Command"
          subtitle={basename(path)}
          actions={
            <ActionPanel>
              <OpenAction title="Open Script" target={path} />
              <OpenWithAction path={path} />
              <ShowInFinderAction path={path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PipeCommand(props: { command: ScriptCommand; input: PipeInput; reload: () => void }) {
  const { path: scriptPath, metadatas } = props.command;
  const navigation = useNavigation();

  function handleCommand(outputHandler: (output: string) => void) {
    return async () => {
      const toast = await showToast(ToastStyle.Animated, "Running...");
      const input = metadatas.input.percentEncoded ? encodeURIComponent(props.input.content) : props.input.content;
      const { stdout, stderr, status } = spawnSync(scriptPath, {
        encoding: "utf-8",
        input,
        maxBuffer: 10 * 1024 * 1024,
      });
      toast.hide();
      if (status == 0 && stdout) {
        await outputHandler(stdout);
      }
      if (stderr) {
        showHUD(stderr);
      }
    };
  }

  return (
    <List.Item
      key={scriptPath}
      icon={{ text: Icon.Text, file: Icon.Document, url: Icon.Globe }[metadatas.input.type]}
      title={metadatas.title}
      subtitle={metadatas.packageName}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item
              title="Copy Output"
              icon={Icon.Clipboard}
              onAction={handleCommand((output) => {
                copyTextToClipboard(output);
                closeMainWindow();
              })}
            />
            <ActionPanel.Item
              title="Paste Output"
              icon={Icon.Pencil}
              onAction={handleCommand((output) => {
                pasteText(output);
                closeMainWindow();
              })}
            />
            <ActionPanel.Item
              title="Pipe Output"
              icon={Icon.ArrowRight}
              onAction={handleCommand((output) => {
                navigation.push(<PipeCommands input={{ type: "text", content: output }} />);
              })}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenAction icon={Icon.Upload} title="Open Pipe Command" target={scriptPath} />
            <OpenWithAction path={scriptPath} />
            <ShowInFinderAction path={scriptPath} />
            <TrashAction paths={scriptPath} onTrash={props.reload} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <PushAction icon={Icon.Plus} title="New Pipe Command" target={<PipeCommandForm />} />
            <ActionPanel.Item
              icon={Icon.ArrowClockwise}
              title="Reset Default Commands"
              onAction={async () => {
                await copyAssetsCommands();
                props.reload();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
