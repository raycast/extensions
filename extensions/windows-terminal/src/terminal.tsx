import {
  ActionPanel,
  Action,
  List,
  Detail,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  AI,
} from "@raycast/api";
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

// AI Safety Check Function
async function checkCommandSafety(command: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const check = await AI.ask(
      `Act as a security researcher. Your purpose is to analyze PowerShell/shell commands and identify the ones that could be unsafe to execute on users machine. Reply with "safe" if it is ok to run the command, otherwise reply with an explanation why is it unsafe. Unsafe are the only ones that could be harmful for user without the way to recover from the damage.
       
       Examples:
       Command: Remove-Item -Path C:\\ -Recurse -Force
       Result: It will remove all files on the C: drive without a way to recover
       
       Command: Get-ChildItem C:\\Users
       Result: safe
       
       Command: Write-Host "Hello, World!"
       Result: safe
       
       Command: Format-Volume -DriveLetter C -FileSystem NTFS -Confirm:$false
       Result: It will format the C: drive and remove all data without confirmation
       
       Command: while($true){Start-Process powershell}
       Result: It will create unlimited processes and crash the system
       
       Command: ${command}
       Result:`,
    );

    const isSafe = check.trim().toLowerCase() === "safe";
    return {
      safe: isSafe,
      reason: isSafe ? undefined : check,
    };
  } catch (error) {
    // If AI check fails, allow execution but warn user
    console.error("AI safety check failed:", error);
    return { safe: true };
  }
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

    let completed = false;

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
      setOutput(formatOutput(accumulatedOutput));
    });

    process.on("close", (code: number) => {
      if (code != 0 && code != null && hasError) {
        console.log(`Command exited with code ${code}`);
        hasError = true;
      }
      if (accumulatedOutput == "") return;
      if (completed) return;
      completed = true;

      clearInterval(timer);
      const duration = Date.now() - startTime;
      setIsLoading(false);

      const finalOutput = accumulatedOutput || "Command executed (no output)";
      const isErrorFinal = hasError || code !== 0;

      const result: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
      if (completed) return;
      completed = true;

      clearInterval(timer);
      const duration = Date.now() - startTime;
      setIsLoading(false);

      setIsError(true);
      setOutput(`Failed to start process: ${error.message}`);

      const result: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
      // Kill the entire process tree on Windows
      const isWindows = process.platform === "win32";

      if (isWindows) {
        // Use taskkill to force terminate the process tree on Windows
        spawn("taskkill", ["/pid", processRef.current.pid!.toString(), "/f", "/t"], {
          shell: true,
          windowsHide: true,
        });
      } else {
        // On Unix-like systems, send SIGKILL
        processRef.current.kill("SIGKILL");
      }

      setIsLoading(false);
      setOutput((prev) => prev + "\n\n[Process terminated by user]");

      // Complete immediately on termination
      onComplete({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        command,
        output: (output || "") + "\n\n[Process terminated by user]",
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
                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
    async (cmd: string) => {
      const trimmedCmd = cmd.trim();
      if (!trimmedCmd) {
        showToast({ style: Toast.Style.Failure, title: "Command cannot be empty" });
        return;
      }

      // Show verification toast
      const verifyingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Verifying command safety...",
      });

      // Check command safety with AI
      const safetyCheck = await checkCommandSafety(trimmedCmd);

      verifyingToast.hide();

      // If command is potentially unsafe, show confirmation dialog
      if (!safetyCheck.safe) {
        const confirmed = await confirmAlert({
          title: "⚠️ Potentially Unsafe Command",
          message: `Command: ${trimmedCmd}\n\n${safetyCheck.reason}`,
          primaryAction: {
            title: "Execute Anyway",
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (!confirmed) {
          showToast({ style: Toast.Style.Success, title: "Command execution cancelled" });
          return;
        }
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
      searchBarPlaceholder="Type shell command and press Enter (AI-verified)"
      throttle={true}
    >
      <List.EmptyView
        title="Shell Terminal with AI Safety"
        description="Enter commands above - AI will verify safety before execution"
        icon="💻"
      />

      {command.trim() && (
        <List.Item
          title={`> ${command}`}
          subtitle="Press Enter to verify and execute with live output"
          icon="⚡"
          actions={
            <ActionPanel>
              <Action title="Execute (AI-Verified)" onAction={() => executeCommand(command)} />
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
