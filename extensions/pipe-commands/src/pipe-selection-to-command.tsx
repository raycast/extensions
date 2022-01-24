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

const defaultScripts = resolve(environment.assetsPath, "commands");
const userScripts = resolve(environment.supportPath);

interface Selection {
  type: ArgumentType;
  content: string;
}

export default function TextActions(): JSX.Element {
  const [state, setState] = useState<{ selection: Selection; commands: ScriptCommand[] }>();

  const packages: Record<string, ScriptCommand[]> = {};
  for (const script of state?.commands || []) {
    const packageName = script.metadatas.packageName || "Others";
    packages[packageName] = [...(packages[packageName] || []), script];
  }

  useEffect(() => {
    async function loadScripts() {
      const [userCommands, defaultCommands] = await Promise.all([
        loadScriptCommands(userScripts),
        loadScriptCommands(defaultScripts),
      ]);
      return [...userCommands, ...defaultCommands];
    }

    async function getSelection(): Promise<Selection> {
      try {
        const files = await getSelectedFinderItems();
        if (files.length == 0) throw new Error("No file selected!");
        return { type: "file", content: files[0].path };
      } catch {
        const text = await getSelectedText();
        return { type: isValidUrl(text) ? "url" : "text", content: text };
      }
    }

    Promise.all([loadScripts(), getSelection()])
      .then(([scripts, selection]) => setState({ selection, commands: scripts }))
      .catch((e) => {
        showToast(ToastStyle.Failure, e.message);
        popToRoot();
      });
  }, []);

  return (
    <List isLoading={typeof state == "undefined"} searchBarPlaceholder="Send selection to...">
      {state
        ? Object.entries(packages).map(([packageName, commands]) => (
            <List.Section key={packageName} title={packageName}>
              {commands
                ?.filter((command) => command.metadatas.argument1.type == state.selection.type)
                .map((command) => (
                  <TextAction key={command.path} command={command} selection={state.selection.content} />
                ))}
            </List.Section>
          ))
        : null}
    </List>
  );
}

function TextAction(props: { command: ScriptCommand; selection: string }) {
  const { path: scriptPath, metadatas } = props.command;

  async function runCommand() {
    chmodSync(scriptPath, "755");
    const argument = metadatas.argument1;

    execa(scriptPath, [argument.percentEncoded ? encodeURIComponent(props.selection) : props.selection], {
      encoding: "utf-8",
    })
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
          await pasteText(res.stdout);
          closeMainWindow();
        } else if (res.stderr) {
          showHUD(res.stderr);
        }
      });
  }

  return (
    <List.Item
      key={scriptPath}
      icon={{ text: Icon.Text, file: Icon.TextDocument, url: Icon.Globe }[metadatas.argument1.type]}
      title={metadatas.title}
      subtitle={metadatas.description}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Run" icon={Icon.Terminal} onAction={runCommand} />
          <OpenWithAction path={scriptPath} />
          <PushAction title="New Pipe Command" target={<PipeCommandForm/>} />
        </ActionPanel>
      }
    />
  );
}
