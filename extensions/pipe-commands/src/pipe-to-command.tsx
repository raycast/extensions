import {
  ActionPanel,
  closeMainWindow,
  environment,
  Icon,
  List,
  Clipboard,
  Toast,
  Action,
  showHUD,
  showToast,
  useNavigation,
  Image,
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
  const [parsed, setParsed] = useState<{ commands: ScriptCommand[] }>();

  const loadCommands = async () => {
    if (readdirSync(environment.supportPath).length == 0) {
      await copyAssetsCommands();
    }
    const { commands } = await parseScriptCommands();
    setParsed({ commands: await sortByAccessTime(commands) });
  };

  useEffect(() => {
    loadCommands();
  }, []);

  return (
    <List isLoading={typeof parsed == "undefined"} searchBarPlaceholder="Pipe Input to...">
      {props.input.type == "file" ? (
        <List.Item
          icon={Icon.Document}
          title="Open With..."
          actions={
            <ActionPanel>
              <Action.OpenWith path={props.input.content} />
            </ActionPanel>
          }
        />
      ) : null}
      {parsed?.commands
        .filter((command) => command.metadatas.input.type == props.input.type)
        .map((command) => (
          <PipeCommand
            key={command.path}
            command={command}
            runCommand={async () => {
              const toast = await showToast(Toast.Style.Animated, "Running...");
              const input = command.metadatas.input.percentEncoded
                ? encodeURIComponent(props.input.content)
                : props.input.content;
              const { stdout, stderr, status } = spawnSync(command.path, {
                encoding: "utf-8",
                input,
                maxBuffer: 10 * 1024 * 1024,
              });
              toast.hide();
              if (status !== 0) {
                showHUD(stderr ? `⚠️ ${stderr}` : `⚠️ Error: Process terminated with status ${status}`);
                return;
              }

              if (stdout) {
                return stdout;
              }

              if (stderr) {
                showHUD(stderr);
              }
            }}
            reload={loadCommands}
          />
        ))}
    </List>
  );
}

export function getRaycastIcon(scriptIcon: string): Image.ImageLike {
  if (scriptIcon.startsWith("http") || scriptIcon.startsWith("https")) {
    return { source: scriptIcon, fallback: Icon.Globe };
  }

  const icon = Icon[scriptIcon as keyof typeof Icon];
  if (!icon) return Icon.Dot;

  return icon;
}

export function PipeCommand(props: {
  command: ScriptCommand;
  runCommand?: () => Promise<string | undefined>;
  reload: () => void;
}) {
  const { path: scriptPath, metadatas } = props.command;
  const navigation = useNavigation();
  const runCommand = props.runCommand;

  return (
    <List.Item
      key={scriptPath}
      icon={metadatas.icon ? getRaycastIcon(metadatas.icon) : Icon.Dot}
      title={metadatas.title}
      subtitle={metadatas.packageName}
      actions={
        <ActionPanel>
          {typeof runCommand != "undefined" ? (
            <ActionPanel.Section>
              <Action
                title="Copy Output"
                icon={Icon.Clipboard}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    await Clipboard.copy(stdout);
                  }
                  closeMainWindow();
                }}
              />
              <Action
                title="Paste Output"
                icon={Icon.Pencil}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    await Clipboard.paste(stdout);
                  }
                  closeMainWindow();
                }}
              />
              <Action
                title="Pipe Output"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "\\" }}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    navigation.push(<PipeCommands input={{ type: "text", content: stdout }} />);
                  }
                }}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.Open icon={Icon.Upload} title="Open Pipe Command" target={scriptPath} />
            <Action.OpenWith path={scriptPath} />
            <Action.ShowInFinder path={scriptPath} />
            <Action.Trash paths={scriptPath} onTrash={props.reload} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Plus} title="New Pipe Command" target={<PipeCommandForm />} />
            <Action
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
