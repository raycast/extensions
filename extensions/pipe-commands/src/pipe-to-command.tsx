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
} from "@raycast/api";
import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import { useEffect, useState } from "react";
import PipeCommandForm from "./create-pipe-command";
import { ArgumentType, ScriptCommand } from "./types";
import { copyAssetsCommands, parseScriptCommands, sortByAccessTime } from "./utils";

export interface PipeInput {
  type: ArgumentType;
  content: string;
}

export function PipeCommands(props: { input: PipeInput }): JSX.Element {
  const [commands, setCommands] = useState<ScriptCommand[]>();

  const loadCommands = async () => {
    if (readdirSync(environment.supportPath).length == 0) {
      await copyAssetsCommands();
    }
    const commands = await parseScriptCommands(environment.supportPath);
    setCommands(await sortByAccessTime(commands));
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof commands == "undefined"} searchBarPlaceholder="Pipe Input to...">
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
      {commands
        ?.filter((command) => command.metadatas.input.type == props.input.type)
        .map((command) => (
          <TextAction key={command.path} command={command} input={props.input} reload={loadCommands} />
        ))}
    </List>
  );
}

function TextAction(props: { command: ScriptCommand; input: PipeInput; reload: () => void }) {
  const { path: scriptPath, metadatas } = props.command;

  function handleCommand(outputHandler: (output: string) => void) {
    return async () => {
      const toast = await showToast(ToastStyle.Animated, "Running...");
      const input = metadatas.input.percentEncoded ? encodeURIComponent(props.input.content) : props.input.content;
      const res = spawnSync(scriptPath, { encoding: "utf-8", input, maxBuffer: 10 * 1024 * 1024 });
      toast.hide();
      if (res.stdout) {
        await outputHandler(res.stdout);
      }
      if (res.stderr) {
        showHUD(res.stderr);
      } else {
        await closeMainWindow();
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
              title="Run (Copy Output)"
              icon={Icon.Terminal}
              onAction={handleCommand(copyTextToClipboard)}
            />
            <ActionPanel.Item title="Run (Paste Output)" icon={Icon.Terminal} onAction={handleCommand(pasteText)} />
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
              title="Restore Default Commands"
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
