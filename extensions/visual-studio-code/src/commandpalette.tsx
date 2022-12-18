import { Action, ActionPanel, List, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";
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
  const cmds = await readCommandsFile(responseFilename);
  return cmds;
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
      await open(`vscode://tonka3000.raycast/runcommand?cmd=${c.command}`);
      popToRoot();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not start Command", message: getErrorMessage(error) });
    }
  };
  return (
    <List.Item
      title={title(c)}
      actions={
        <ActionPanel>
          <Action title="Run Command" onAction={handle} />
        </ActionPanel>
      }
    />
  );
}

export default function CommandPaletteCommand(): JSX.Element {
  const { isLoading, commands } = useCommands();
  return (
    <List isLoading={isLoading}>
      {commands?.map((c) => (
        <CommandListItem key={c.command} command={c} />
      ))}
    </List>
  );
}

async function readCommandsFile(filename: string): Promise<CommandMetadata[] | undefined> {
  const data = await afs.readFile(filename, "utf-8");
  const result = JSON.parse(data) as CommandMetadata[] | undefined;
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
