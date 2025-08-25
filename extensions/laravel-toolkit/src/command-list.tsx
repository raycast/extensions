import { List, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, Alert, Detail } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runArtisan, cleanupRunningProcesses, ArtisanRunOptions } from "../lib/artisan";
import { useDebounce } from "../lib/hooks";
import { analyzeCommand, getCommandExplanation } from "../lib/commandRunner";
import { formatProjectInfo } from "../lib/projectDisplay";

interface ArtisanCommand {
  name: string;
  description: string;
}

interface ArtisanCommandJsonItem {
  name?: string;
  description?: string;
}

interface ArtisanListJsonResponse {
  commands?: Record<string, ArtisanCommandJsonItem>;
}

function parseArtisanList(output: string): ArtisanCommand[] {
  try {
    const data: ArtisanListJsonResponse = JSON.parse(output);
    if (data.commands) {
      return Object.values(data.commands).map((cmd: ArtisanCommandJsonItem) => ({
        name: cmd.name ?? "",
        description: cmd.description ?? "",
      }));
    }
  } catch (jsonError) {
    // fall back to text parsing
    console.warn("Failed to parse artisan list as JSON:", jsonError);
  }

  const commands: ArtisanCommand[] = [];
  const lines = output.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([\w:-]+)\s{2,}(.*)$/);
    if (match) {
      commands.push({ name: match[1], description: match[2] });
    }
  }
  return commands;
}

export default function Command() {
  const [commands, setCommands] = useState<ArtisanCommand[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<ArtisanCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [commandOutput, setCommandOutput] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const debouncedSearchText = useDebounce(searchText, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cleanupRunningProcesses();
    };
  }, []);

  useEffect(() => {
    async function fetchCommands() {
      try {
        const projectRoot = await findLaravelProjectRoot();
        if (!projectRoot) {
          setError("No active Laravel project found. Please add a project first.");
          return;
        }
        setProjectPath(projectRoot);

        let output: string;
        try {
          output = await runArtisan("list --format=json", projectRoot);
        } catch (jsonError) {
          console.warn("JSON format not supported, falling back to text format:", jsonError);
          output = await runArtisan("list", projectRoot);
        }

        const parsedCommands = parseArtisanList(output);
        setCommands(parsedCommands);
        setFilteredCommands(parsedCommands);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        await showToast({ style: Toast.Style.Failure, title: "Failed to load commands", message });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommands();
  }, []);

  // Filter commands based on search text
  useEffect(() => {
    if (!debouncedSearchText.trim()) {
      setFilteredCommands(commands);
      return;
    }

    const searchLower = debouncedSearchText.toLowerCase();
    const filtered = commands.filter(
      (command) =>
        command.name.toLowerCase().includes(searchLower) || command.description.toLowerCase().includes(searchLower),
    );

    setFilteredCommands(filtered);
  }, [debouncedSearchText, commands]);

  const executeCommand = async (commandName: string) => {
    const analysis = analyzeCommand(commandName);

    if (!analysis.isRunnable) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Run Command",
        message: analysis.reason || "This command cannot be run from this interface",
      });
      return;
    }

    // Show confirmation for commands that require it
    if (analysis.requiresConfirmation) {
      const confirmed = await confirmAlert({
        title: "Confirm Command Execution",
        message: `${analysis.reason || "This command may modify your application."}\n\nAre you sure you want to run: php artisan ${commandName}?`,
        primaryAction: {
          title: "Run Command",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) {
        return;
      }
    }

    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setExecutingCommand(commandName);
    setCommandOutput(null);
    setCommandError(null);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Running: php artisan ${commandName}`,
      });

      const projectRoot = await findLaravelProjectRoot();
      if (!projectRoot) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Laravel Project Found",
          message: "Please add a Laravel project first",
        });
        return;
      }

      const options: ArtisanRunOptions = {
        signal: abortControllerRef.current.signal,
        timeout: 120000, // 2 minute timeout
      };

      const result = await runArtisan(commandName, projectRoot, options);
      setCommandOutput(result);

      await showToast({
        style: Toast.Style.Success,
        title: "Command Completed",
        message: `php artisan ${commandName}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setCommandError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: errorMessage,
      });
    } finally {
      setExecutingCommand(null);
    }
  };

  // Show command output if available
  if (commandOutput || commandError) {
    const content = commandError
      ? `**Error:**\n\n\`\`\`\n${commandError}\n\`\`\``
      : `**Output:**\n\n\`\`\`\n${commandOutput}\n\`\`\``;

    return (
      <Detail
        markdown={content}
        actions={
          <ActionPanel>
            <Action
              title="Back to Commands"
              onAction={() => {
                setCommandOutput(null);
                setCommandError(null);
              }}
            />
            {executingCommand && (
              <Action
                title="Cancel Operation"
                style={Action.Style.Destructive}
                onAction={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  setExecutingCommand(null);
                }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }
  if (error) {
    return (
      <List>
        <List.EmptyView title="Error Loading Commands" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || !!executingCommand}
      searchBarPlaceholder="Filter artisan commands…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
      navigationTitle={projectPath ? `Artisan Commands - ${formatProjectInfo(projectPath)}` : "Artisan Commands"}
    >
      {filteredCommands.map((cmd) => {
        const analysis = analyzeCommand(cmd.name);
        const isCurrentlyExecuting = executingCommand === cmd.name;

        return (
          <List.Item
            key={cmd.name}
            title={cmd.name}
            subtitle={cmd.description}
            accessories={[
              ...(analysis.isRunnable ? [{ text: "Runnable", icon: Icon.Play }] : []),
              ...(isCurrentlyExecuting ? [{ text: "Running...", icon: Icon.Clock }] : []),
            ]}
            actions={
              <ActionPanel>
                {analysis.isRunnable && !isCurrentlyExecuting && (
                  <Action title="Run Command" icon={Icon.Play} onAction={() => executeCommand(cmd.name)} />
                )}
                <Action.CopyToClipboard title="Copy Command" content={cmd.name} />
                <Action
                  title="Show Run Info"
                  icon={Icon.Info}
                  onAction={async () => {
                    await showToast({
                      style: analysis.isRunnable ? Toast.Style.Success : Toast.Style.Failure,
                      title: analysis.isRunnable ? "Command can be run" : "Command cannot be run",
                      message: getCommandExplanation(cmd.name),
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {filteredCommands.length === 0 && !isLoading && commands.length > 0 && (
        <List.EmptyView
          title="No Commands Match"
          description={`No commands match "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
      {commands.length === 0 && !isLoading && (
        <List.EmptyView title="No Commands Found" description="No artisan commands found" icon={Icon.List} />
      )}
    </List>
  );
}
