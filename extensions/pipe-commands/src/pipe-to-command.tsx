import {
  ActionPanel,
  Icon,
  List,
  Clipboard,
  Toast,
  Action,
  showHUD,
  showToast,
  Image,
  closeMainWindow,
  popToRoot,
  getSelectedText,
  environment,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { spawnSync } from "child_process";
import { chmodSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import React, { useEffect, useState } from "react";
import untildify from "untildify";
import { ScriptCommand } from "./types";
import { codeblock, parseScriptCommands, sortByAccessTime } from "./utils";

type InputType = "text" | "clipboard";

export function PipeCommands(props: { inputFrom?: InputType }): JSX.Element {
  const { inputFrom } = props;
  const [commands, setCommands] = useState<ScriptCommand[]>();

  const loadCommands = async () => {
    const { commands } = await parseScriptCommands();
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

export function getRaycastIcon(script: ScriptCommand): Image.ImageLike {
  const buildIcon = (icon: string) => {
    if (icon.startsWith("http") || icon.startsWith("https")) {
      return { source: icon };
    }
    const iconPath = resolve(dirname(script.path), icon);
    if (existsSync(iconPath)) {
      return { source: iconPath };
    }
    return icon;
  };
  if (environment.theme === "dark" && script.metadatas.iconDark) {
    return buildIcon(script.metadatas.iconDark);
  }
  if (script.metadatas.icon) {
    return buildIcon(script.metadatas.icon);
  }
  return "➡️";
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
    case "text":
      return getSelectedText();
  }
}

const { pipePrimaryAction } = getPreferenceValues<{ pipePrimaryAction: "copy" | "paste" }>();

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
      icon={getRaycastIcon(command)}
      accessories={[{ text: command.metadatas.mode, tooltip: "Mode" }]}
      title={command.metadatas.title}
      subtitle={showContent ? undefined : command.metadatas.packageName}
      detail={
        showContent ? <List.Item.Detail markdown={["## Content", codeblock(command.content)].join("\n")} /> : undefined
      }
      actions={
        <ActionPanel>
          {typeof inputFrom != "undefined" ? (
            <ActionPanel.Section>
              <CommandActions command={command} inputFrom={inputFrom} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            {command.user ? (
              <React.Fragment>
                <Action.Open icon={Icon.TextDocument} title="Open Command" target={command.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.OpenWith path={command.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
                <Action.ShowInFinder path={command.path} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} />
                <Action.Trash paths={command.path} onTrash={onTrash} shortcut={{ modifiers: ["ctrl"], key: "x" }} />
              </React.Fragment>
            ) : null}
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
  const { stdout, stderr, status } = spawnSync(command.path, [argument1], {
    encoding: "utf-8",
    cwd: command.metadatas.currentDirectoryPath
      ? untildify(command.metadatas.currentDirectoryPath)
      : dirname(command.path),
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

function CommandActions(props: { command: ScriptCommand; inputFrom: InputType }) {
  const { command, inputFrom } = props;

  function outputHandler(onSuccess: (output: string) => void) {
    return async () => {
      if (
        command.metadatas.needsConfirmation &&
        !(await confirmAlert({
          title: command.metadatas.title,
          message: "Are you sure you want to run this script ?",
          primaryAction: { title: "Run Script" },
          icon: getRaycastIcon(command),
        }))
      ) {
        return;
      }
      try {
        const output = await runCommand(command, inputFrom);
        if (output) await onSuccess(output);
        await closeMainWindow();
        await popToRoot();
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

  switch (command.metadatas.mode) {
    case "silent":
      return <Action title="Run Script" icon={Icon.Terminal} onAction={outputHandler(showHUD)} />;
    case "pipe": {
      const copyAction = (
        <Action
          key="copy"
          icon={Icon.Terminal}
          title="Copy Script Output"
          onAction={outputHandler(async (output) => {
            await Clipboard.copy(output);
            await showHUD("Copied to clipboard!");
          })}
        />
      );
      const pasteAction = (
        <Action
          key="paste"
          icon={Icon.Terminal}
          title="Paste Script Output"
          onAction={outputHandler(Clipboard.paste)}
        />
      );

      return (
        <React.Fragment>
          {pipePrimaryAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction]}
        </React.Fragment>
      );
    }
  }
}
