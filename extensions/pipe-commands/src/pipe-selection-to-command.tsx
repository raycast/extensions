import {
  ActionPanel,
  closeMainWindow,
  copyTextToClipboard,
  environment,
  getSelectedFinderItems,
  getSelectedText,
  Icon,
  List,
  OpenWithAction,
  pasteText,
  popToRoot,
  PushAction,
  render,
  showHUD,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { execa } from "execa";
import { chmodSync } from "fs";
import { resolve } from "path";
import { useEffect, useState } from "react";
import PipeCommandForm from "./create-pipe-command";
import { ArgumentType, ScriptCommand } from "./types";
import { isValidUrl, loadScriptCommands } from "./utils";

interface Selection {
  type: ArgumentType;
  content: string[];
}

function PipeCommands(props: { selection: Selection }): JSX.Element {
  const [commands, setCommands] = useState<ScriptCommand[]>();

  useEffect(() => {
    async function loadCommands() {
      const [userCommands, defaultCommands] = await Promise.all([
        loadScriptCommands(environment.supportPath),
        loadScriptCommands(resolve(environment.assetsPath, "commands")),
      ]);
      return [...userCommands, ...defaultCommands];
    }

    loadCommands()
      .then(setCommands)
      .catch((e) => {
        showHUD(e.message);
        popToRoot();
      });
  }, []);

  return (
    <List isLoading={typeof commands == "undefined"} searchBarPlaceholder="Pipe selection to...">
      {props.selection.type == "file" && props.selection.content.length == 1 ? (
          <List.Item
            icon={Icon.TextDocument}
            subtitle="File Actions"
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
          <TextAction key={command.path} command={command} selection={props.selection} />
        ))}
    </List>
  );
}

function TextAction(props: { command: ScriptCommand; selection: Selection }) {
  const { path: scriptPath, metadatas } = props.command;

  async function runCommand(onSuccess: (stdout: string) => void) {
    chmodSync(scriptPath, 0o755);

    execa(
      scriptPath,
      metadatas.selection.percentEncoded ? props.selection.content.map(encodeURIComponent) : props.selection.content,
      {
        encoding: "utf-8",
      }
    )
      .catch(async (e) => {
        const toast = new Toast({
          style: ToastStyle.Failure,
          title: "An error occured!",
          message: e.shortMessage,
          primaryAction: {
            title: "Copy Error",
            onAction: async () => {
              await copyTextToClipboard(e.stderr);
              await toast.hide();
            },
          },
        });
        await toast.show();
        popToRoot();
      })
      .then(async (res) => {
        if (!res) return;
        if (res.stdout) {
          onSuccess(res.stdout);
        } else if (res.stderr) {
          showHUD(res.stderr);
        }
        closeMainWindow();
      });
  }

  return (
    <List.Item
      key={scriptPath}
      icon={{ text: Icon.Text, file: Icon.TextDocument, url: Icon.Globe }[metadatas.selection.type]}
      title={metadatas.title}
      subtitle={metadatas.packageName}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item title="Paste Output" icon={Icon.Terminal} onAction={() => runCommand(pasteText)} />
            <ActionPanel.Item
              title="Copy Output"
              icon={Icon.Terminal}
              onAction={() => runCommand(copyTextToClipboard)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenWithAction title="Open Pipe Command" path={scriptPath} />
            <PushAction title="New Pipe Command" target={<PipeCommandForm />} />
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
    return { type: isValidUrl(text) ? "url" : "text", content: [text] };
  }
}

async function main() {
  try {
    const selection = await getSelection();
    render(<PipeCommands selection={selection} />);
  } catch (e: unknown) {
    showToast(ToastStyle.Failure, (e as Error).message);
  }
}

main();
