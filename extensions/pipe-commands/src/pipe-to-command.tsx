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
  Detail,
} from "@raycast/api";
import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import { dirname } from "path";
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
          <PipeCommand
            key={command.path}
            command={command}
            runCommand={async () => {
              const toast = await showToast(Toast.Style.Animated, "Running...");
              const input = command.metadatas.argument1.percentEncoded
                ? encodeURIComponent(props.input.content)
                : props.input.content;
              // Pass the input both to the command stdin and as command fist argument
              const { stdout, stderr, status } = spawnSync(command.path, [input], {
                encoding: "utf-8",
                input,
                cwd: command.metadatas.currentDirectoryPath
                  ? command.metadatas.currentDirectoryPath
                  : dirname(command.path),
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
            onTrash={loadCommands}
          />
        ))}
    </List>
  );
}

export function getRaycastIcon(scriptIcon: string | undefined, defaultIcon: Image.ImageLike): Image.ImageLike {
  const icon = Icon[scriptIcon as keyof typeof Icon];
  return icon ? icon : defaultIcon;
}

export function PipeCommand(props: {
  command: ScriptCommand;
  runCommand?: () => Promise<string | undefined>;
  onTrash: () => void;
}) {
  const { path: scriptPath, metadatas } = props.command;
  const navigation = useNavigation();
  const runCommand = props.runCommand;
  const defaultIcon = metadatas.argument1.type == "file" ? Icon.Document : Icon.Text;

  return (
    <List.Item
      key={scriptPath}
      icon={getRaycastIcon(metadatas.icon, defaultIcon)}
      title={metadatas.title}
      subtitle={metadatas.packageName}
      actions={
        <ActionPanel>
          {typeof runCommand != "undefined" ? (
            <ActionPanel.Section>
              <Action
                title="Copy to Clipboard"
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
                title="Paste in Active App"
                icon={Icon.Clipboard}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    await Clipboard.paste(stdout);
                  }
                  closeMainWindow();
                }}
              />
              <Action
                title="Pipe to Command"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "\\" }}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    navigation.push(<PipeCommands input={{ type: "text", content: stdout }} />);
                  }
                }}
              />
              <Action
                title="Preview"
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onAction={async () => {
                  const stdout = await runCommand();
                  if (stdout) {
                    navigation.push(
                      <Detail
                        markdown={"```\n" + stdout + "\n```"}
                        actions={
                          <ActionPanel>
                            <Action.CopyToClipboard content={stdout} onCopy={() => closeMainWindow()} />
                            <Action.Paste content={stdout} onPaste={() => closeMainWindow()} />
                          </ActionPanel>
                        }
                      />
                    );
                  }
                }}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.Open icon={Icon.Upload} title="Open Pipe Command" target={scriptPath} />
            <Action.OpenWith path={scriptPath} />
            <Action.ShowInFinder path={scriptPath} />
            <Action.Trash paths={scriptPath} onTrash={props.onTrash} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Plus} title="New Pipe Command" target={<PipeCommandForm />} />
            <Action
              icon={Icon.ArrowClockwise}
              title="Reset Default Commands"
              onAction={async () => {
                await copyAssetsCommands();
                props.onTrash();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
