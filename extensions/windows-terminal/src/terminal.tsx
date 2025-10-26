import { ActionPanel, Action, List, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { spawn, ChildProcess } from "child_process";
import { useState, useCallback, useRef, useEffect } from "react";
import { useCachedState } from "@raycast/utils";

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  timestamp: number;
  isError: boolean;
  duration: number;
}

// Live execution fullscreen view
function LiveExecutionView({ command, onComplete }: { command: string; onComplete: (result: HistoryItem) => void }) {
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [startTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const processRef = useRef<ChildProcess | null>(null);

  const formatOutput = useCallback((output: string): string => {
    return output.replace(/\t/g, "    ").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }, []);

  useEffect(() => {
    // Update timer for live duration
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    let completed = false; // Flag to prevent double completion

    // Start command execution
    const process = spawn(command, {
      shell: true,
      windowsHide: true,
    });

    processRef.current = process;
    let accumulatedOutput = "";
    let hasError = false;

    process.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      accumulatedOutput += chunk;
      setIsError(false);
      setOutput(formatOutput(accumulatedOutput));
    });

    process.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      accumulatedOutput += chunk;
      // hasError = true;
      // setIsError(true);
      setOutput(formatOutput(accumulatedOutput));
    });

    process.on("close", (code: number) => {
      if (code != 0 && code != null && hasError) {
        console.log(`Command exited with code ${code}`);
        hasError = true;
        // setIsError(true);
      }
      if (accumulatedOutput == "") return;
      if (completed) return; // Prevent duplicate completion
      completed = true;

      clearInterval(timer);
      const duration = Date.now() - startTime;
      setIsLoading(false);

      const finalOutput = accumulatedOutput || "Command executed (no output)";
      const isErrorFinal = hasError || code !== 0;

      const result: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        command,
        output: formatOutput(finalOutput),
        timestamp: Date.now(),
        isError: isErrorFinal,
        duration,
      };

      // Auto-return after showing final result
      setTimeout(() => {
        onComplete(result);
      }, 2000);
    });

    process.on("error", (error: Error) => {
      // This only triggers if the process could not be started
      if (completed) return;
      completed = true;

      clearInterval(timer);
      const duration = Date.now() - startTime;
      setIsLoading(false);

      setIsError(true);
      setOutput(`Failed to start process: ${error.message}`);

      const result: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        command,
        output: `Failed to start process: ${error.message}`,
        timestamp: Date.now(),
        isError: true,
        duration,
      };

      setTimeout(() => {
        onComplete(result);
      }, 2000);
    });

    return () => {
      clearInterval(timer);
      if (processRef.current && !completed) {
        processRef.current.kill();
      }
    };
  }, [command, startTime, formatOutput, onComplete]);

  const buildLiveMarkdown = () => {
    const currentDuration = currentTime - startTime;

    let content = `# Live Command Execution\n\n`;
    content += `\`${command}\`\n\n`;
    content += `**${currentDuration}ms** ${isLoading ? "⏳" : isError ? "❌" : "✅"}\n\n`;
    content += `---\n\n`;

    if (output) {
      content += `\`\`\`\n${output}\n\`\`\``;
    } else if (isLoading) {
      content += `*Starting command execution...*`;
    }

    return content;
  };

  const cancelExecution = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
      setIsLoading(false);
      onComplete({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        command,
        output: output || "Command cancelled by user",
        timestamp: Date.now(),
        isError: true,
        duration: Date.now() - startTime,
      });
    }
  }, [command, onComplete, startTime, output]);

  return (
    <Detail
      markdown={buildLiveMarkdown()}
      actions={
        <ActionPanel>
          {isLoading ? (
            <Action title="Terminate" onAction={cancelExecution} icon="❌" />
          ) : (
            <Action
              title="Back to Terminal"
              onAction={() =>
                onComplete({
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  command,
                  output,
                  timestamp: Date.now(),
                  isError,
                  duration: Date.now() - startTime,
                })
              }
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Terminal() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useCachedState<HistoryItem[]>("terminal-history", []);
  const { push } = useNavigation();

  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmedCmd = cmd.trim();
      if (!trimmedCmd) {
        showToast({ style: Toast.Style.Failure, title: "Command cannot be empty" });
        return;
      }

      // Navigate to live execution view
      push(
        <LiveExecutionView
          command={trimmedCmd}
          onComplete={(result) => {
            setHistory((prev) => [result, ...prev.slice(0, 99)]);
            setCommand("");
            showToast({
              style: result.isError ? Toast.Style.Failure : Toast.Style.Success,
              title: result.isError ? "Command failed" : "Command completed",
              message: `${result.duration}ms`,
            });
          }}
        />,
      );
    },
    [push, setHistory],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast({ style: Toast.Style.Success, title: "Terminal cleared" });
  }, [setHistory]);

  const truncateOutput = (output: string, maxLines: number = 3): string => {
    const lines = output.split("\n");
    if (lines.length <= maxLines) return output;
    return lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} more lines)`;
  };

  return (
    <List
      searchText={command}
      onSearchTextChange={setCommand}
      searchBarPlaceholder="Type shell command and press Enter"
      throttle={true}
    >
      <List.EmptyView
        title="Shell Terminal"
        description="Enter commands above to execute in fullscreen live view"
        icon="💻"
      />

      {command.trim() && (
        <List.Item
          title={`> ${command}`}
          subtitle="Press Enter to execute with live output"
          icon="⚡"
          actions={
            <ActionPanel>
              <Action title="Execute" onAction={() => executeCommand(command)} />
            </ActionPanel>
          }
        />
      )}

      {history.map((item) => {
        const time = new Date(item.timestamp).toLocaleTimeString();
        const hasTypedCommand = command.trim().length > 0;

        return (
          <List.Item
            key={item.id}
            title={`> ${item.command}`}
            subtitle={truncateOutput(item.output, 3)}
            icon={item.isError ? "❌" : "✅"}
            accessories={[{ text: `${time} • ${item.duration}ms` }]}
            actions={
              <ActionPanel>
                {hasTypedCommand ? (
                  <>
                    <Action title={`Execute: ${command}`} onAction={() => executeCommand(command)} />
                    <Action.Push
                      title="View Full Output"
                      target={
                        <Detail
                          markdown={`# Command Output\n\n**Command:** \`${item.command}\`\n\n**Executed:** ${time}\n\n**Duration:** ${item.duration}ms\n\n**Status:** ${item.isError ? "❌ Failed" : "✅ Success"}\n\n## Output:\n\n\`\`\`\n${item.output}\n\`\`\``}
                          actions={
                            <ActionPanel>
                              <Action title="Execute Again" onAction={() => executeCommand(item.command)} />
                              <Action.CopyToClipboard title="Copy Command" content={item.command} />
                              <Action.CopyToClipboard title="Copy Output" content={item.output} />
                            </ActionPanel>
                          }
                        />
                      }
                    />
                  </>
                ) : (
                  <Action.Push
                    title="View Full Output"
                    target={
                      <Detail
                        markdown={`# Command Output\n\n**Command:** \`${item.command}\`\n\n**Executed:** ${time}\n\n**Duration:** ${item.duration}ms\n\n**Status:** ${item.isError ? "❌ Failed" : "✅ Success"}\n\n## Output:\n\n\`\`\`\n${item.output}\n\`\`\``}
                        actions={
                          <ActionPanel>
                            <Action title="Execute Again" onAction={() => executeCommand(item.command)} />
                            <Action.CopyToClipboard title="Copy Command" content={item.command} />
                            <Action.CopyToClipboard title="Copy Output" content={item.output} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                )}
                <Action title="Execute Again" onAction={() => executeCommand(item.command)} />
                <Action.CopyToClipboard title="Copy Command" content={item.command} />
                <Action.CopyToClipboard title="Copy Output" content={item.output} />
                <Action
                  title="Clear History"
                  onAction={clearHistory}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
