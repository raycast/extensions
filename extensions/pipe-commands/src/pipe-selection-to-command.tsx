import {
  ActionPanel,
  closeMainWindow,
  copyTextToClipboard,
  environment,
  getSelectedFinderItems,
  getSelectedText,
  Icon,
  List,
  OpenAction,
  OpenWithAction,
  pasteText,
  PushAction,
  render,
  showHUD,
  ShowInFinderAction,
  showToast,
  ToastStyle,
  TrashAction,
} from "@raycast/api";
import { execa } from "execa";
import { readdirSync } from "fs";
import { useEffect, useState } from "react";
import PipeCommandForm from "./create-pipe-command";
import { ArgumentType, ScriptCommand } from "./types";
import { copyAssetsCommands, parseScriptCommands } from "./utils";

interface Selection {
  type: ArgumentType;
  content: string[];
}

function PipeCommands(props: { selection: Selection }): JSX.Element {
  const [commands, setCommands] = useState<ScriptCommand[]>();

  const loadCommands = async () => {
    const commands = await parseScriptCommands(environment.supportPath);
    setCommands(commands);
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof commands == "undefined"} searchBarPlaceholder="Pipe selection to...">
      {props.selection.type == "file" && props.selection.content.length == 1 ? (
        <List.Item
          icon={Icon.Document}
          title="Open With"
          actions={
            <ActionPanel>
              <OpenWithAction path={props.selection.content[0]} />
            </ActionPanel>
          }
        />
      ) : null}
      {commands
        ?.filter((command) => command.metadatas.selection.type == props.selection.type)
        .map((command) => (
          <TextAction key={command.path} command={command} selection={props.selection} reload={loadCommands} />
        ))}
    </List>
  );
}

function TextAction(props: { command: ScriptCommand; selection: Selection; reload: () => void }) {
  const { path: scriptPath, metadatas } = props.command;

  function handleCommand(outputHandler: (output: string) => void) {
    return async () => {
      const toast = await showToast(ToastStyle.Animated, "Running...");
      const res = await execa(
        scriptPath,
        metadatas.selection.percentEncoded ? props.selection.content.map(encodeURIComponent) : props.selection.content,
        {
          encoding: "utf-8",
        }
      );
      toast.hide()
      if (res.stdout) {
        await outputHandler(res.stdout);
        await closeMainWindow();
      } else if (res.stderr) {
        await showHUD(res.stderr);
      }
    };
  }

  return (
    <List.Item
      key={scriptPath}
      icon={{ text: Icon.Text, file: Icon.Document, url: Icon.Globe }[metadatas.selection.type]}
      title={metadatas.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item title="Run (Paste Output)" icon={Icon.Terminal} onAction={handleCommand(pasteText)} />
            <ActionPanel.Item
              title="Run (Copy Output)"
              icon={Icon.Terminal}
              onAction={handleCommand(copyTextToClipboard)}
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

async function getSelection(): Promise<Selection> {
  try {
    const files = await getSelectedFinderItems();
    if (files.length == 0) throw new Error("No file selected!");
    return { type: "file", content: files.map((file) => file.path) };
  } catch {
    const text = await getSelectedText();
    return { type: "text", content: [text] };
  }
}

async function main() {
  if (readdirSync(environment.supportPath).length == 0) {
    await copyAssetsCommands();
  }

  try {
    const selection = await getSelection();
    render(<PipeCommands selection={selection} />);
  } catch (e: unknown) {
    showToast(ToastStyle.Failure, (e as Error).message);
  }
}

main();
