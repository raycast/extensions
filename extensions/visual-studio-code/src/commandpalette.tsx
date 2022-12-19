import { Action, ActionPanel, List, showHUD, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fileExists, getErrorMessage, openURIinVSCode, raycastForVSCodeURI, waitForFileExists } from "./utils";
import * as afs from "fs/promises";
import * as os from "os";
import path from "path";

interface CommandMetadata {
  command: string;
  title: string;
  category?: string;
}

function transitFolder(): string {
  const ts = path.join(os.homedir(), "Library/Application Support/Code/User/globalStorage/tonka3000.raycast/transit");
  return ts;
}

async function getCommandFromVSCode() {
  const tsFolder = transitFolder();
  await afs.mkdir(tsFolder, { recursive: true });
  const requestFilename = path.join(tsFolder, "request.json");
  const responseFilename = path.join(tsFolder, "commands.json");
  await afs.writeFile(
    requestFilename,
    JSON.stringify(
      {
        command: "writecommands",
        args: {
          filename: responseFilename,
        },
      },
      null,
      2
    )
  );
  if (await fileExists(responseFilename)) {
    await afs.rm(responseFilename);
  }
  if (await waitForFileExists(responseFilename)) {
    const cmds = await readCommandsFile(responseFilename);
    return cmds;
  }
  throw new Error("Could not get VSCode commands");
}

function CommandListItem(props: { command: CommandMetadata }): JSX.Element {
  const c = props.command;
  const title = (c: CommandMetadata) => {
    if (c.category) {
      return `${c.category}: ${c.title}`;
    } else {
      return c.title;
    }
  };
  const handle = async () => {
    try {
      await openURIinVSCode(`runcommand?cmd=${c.command}`);
      popToRoot();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not run Command", message: getErrorMessage(error) });
    }
  };
  return (
    <List.Item
      title={title(c)}
      actions={
        <ActionPanel>
          <Action title="Run Command" onAction={handle} icon={{ source: Icon.Terminal }} />
          <Action.CopyToClipboard title="Copy Command ID" content={c.command} />
          <Action.CreateQuicklink
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            quicklink={{ link: raycastForVSCodeURI(`runcommand?cmd=${c.command}`), name: c.title }}
          />
        </ActionPanel>
      }
    />
  );
}

function InstallRaycastForVSCodeAction(): JSX.Element {
  return (
    <Action.OpenInBrowser
      title="Install Raycast for VSCode"
      url="vscode:extension/tonka3000.raycast"
      onOpen={() => {
        popToRoot();
        showHUD("Open VSCode Extension");
      }}
    />
  );
}

export default function CommandPaletteCommand(): JSX.Element {
  const { isLoading, commands, error } = useCommands();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isLoading === true ? "Load Commands from VSCode" : "Search Commands"}
    >
      {commands?.map((c) => (
        <CommandListItem key={c.command} command={c} />
      ))}
      {error && (
        <List.EmptyView
          title="No Response from Raycast for VSCode extension"
          icon="⚠️"
          actions={
            <ActionPanel>
              <InstallRaycastForVSCodeAction />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

async function readCommandsFile(filename: string): Promise<CommandMetadata[] | undefined> {
  const data = await afs.readFile(filename, "utf-8");
  const result = JSON.parse(data) as CommandMetadata[] | undefined;
  await afs.rm(filename);
  return result;
}

function useCommands(): {
  commands: CommandMetadata[] | undefined;
  isLoading?: boolean;
  error?: string;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [commands, setCommands] = useState<CommandMetadata[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let didUnmount = false;
    async function fetchCommands() {
      if (didUnmount) {
        return;
      }
      setIsLoading(true);
      setError(undefined);
      try {
        const cmds = await getCommandFromVSCode();
        if (!didUnmount) {
          setCommands(cmds);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }
    fetchCommands();
    return () => {
      didUnmount = true;
    };
  }, []);

  return { commands, isLoading, error };
}
