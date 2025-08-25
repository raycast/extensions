import { Action, ActionPanel, Icon, List, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import * as afs from "fs/promises";
import * as os from "os";
import path from "path";
import { useEffect, useState } from "react";
import { getBuildNamePreference, getBuildScheme } from "./lib/vscode";
import { fileExists, getErrorMessage, openURIinVSCode, raycastForVSCodeURI, waitForFileExists, isWin } from "./utils";

interface CommandMetadata {
  command: string;
  title: string;
  category?: string;
}

function transitFolder(): string {
  const build = getBuildNamePreference();

  let ts = path.join(os.homedir(), `Library/Application Support/${build}/User/globalStorage/tonka3000.raycast/transit`);

  if (isWin) {
    ts = path.join(os.homedir(), `AppData/Roaming/${build}/User/globalStorage/tonka3000.raycast/transit`);
  }
  return ts;
}

function CreateCommandQuickLinkAction(props: { command: CommandMetadata }): JSX.Element {
  const c = props.command;
  const title = c.category ? `${c.category}: ${c.title}` : c.title;
  return (
    <Action.CreateQuicklink
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      quicklink={{ link: raycastForVSCodeURI(`runcommand?cmd=${c.command}`), name: `VSCode - ${title}` }}
    />
  );
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
          <ActionPanel.Section>
            <Action title="Run Command" onAction={handle} icon={{ source: Icon.Terminal }} />
            <CreateCommandQuickLinkAction command={c} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              title="Copy Command Id"
              content={c.command}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function InstallRaycastForVSCodeAction(): JSX.Element {
  return (
    <Action.OpenInBrowser
      title="Install Raycast for Vscode"
      url={`${getBuildScheme()}:extension/tonka3000.raycast`}
      onOpen={() => {
        popToRoot();
        showHUD("Open VSCode Extension");
      }}
    />
  );
}

export default function CommandPaletteCommand(): JSX.Element {
  const { isLoading, commands, error, refresh } = useCommands();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isLoading === true ? "Load Commands from VSCode" : "Search Commands"}
    >
      <List.Section title="Commands" subtitle={`${commands?.length}`}>
        {commands?.map((c) => (
          <CommandListItem key={c.command} command={c} />
        ))}
      </List.Section>
      {error && (
        <List.EmptyView
          title="No Response from Raycast for VSCode extension"
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
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
  refresh?: () => void;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [commands, setCommands] = useState<CommandMetadata[]>();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(new Date());

  const refresh = () => {
    setDate(new Date());
  };

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
  }, [date]);

  return { commands, isLoading, error, refresh };
}
