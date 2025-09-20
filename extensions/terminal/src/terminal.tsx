import { ActionPanel, Action, List, showToast, Toast, Detail } from "@raycast/api";
import { exec } from "child_process";
import { useState, useCallback } from "react";
import { useCachedState } from "@raycast/utils";

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  timestamp: number;
  isError: boolean;
  duration: number;
}

export default function Terminal() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useCachedState<HistoryItem[]>("terminal-history", []);
  const [isLoading, setIsLoading] = useState(false);

  const formatOutput = useCallback((output: string): string => {
    return output.replace(/\t/g, "    ").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }, []);

  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmedCmd = cmd.trim();
      if (!trimmedCmd) {
        showToast({ style: Toast.Style.Failure, title: "Command cannot be empty" });
        return;
      }

      setIsLoading(true);
      const startTime = Date.now();

      exec(
        `powershell.exe -NoProfile -Command "${trimmedCmd.replace(/"/g, '`"')}"`,
        {
          encoding: "utf8",
          maxBuffer: 2 * 1024 * 1024,
          timeout: 60000,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          setIsLoading(false);

          let output = "";
          let isError = false;

          if (error) {
            output = error.message;
            isError = true;
            showToast({
              style: Toast.Style.Failure,
              title: "Command failed",
              message: `${duration}ms`,
            });
          } else {
            const combinedOutput = stderr ? `${stderr}\n${stdout}` : stdout;
            output = combinedOutput || "Command executed (no output)";
            isError = !!stderr;

            showToast({
              style: isError ? Toast.Style.Failure : Toast.Style.Success,
              title: isError ? "Warning" : "Success",
              message: `${duration}ms`,
            });
          }

          const historyItem: HistoryItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            command: trimmedCmd,
            output: formatOutput(output),
            timestamp: Date.now(),
            isError,
            duration,
          };

          setHistory((prev) => [historyItem, ...prev.slice(0, 99)]);
          setCommand("");
        },
      );
    },
    [formatOutput, setHistory],
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
      isLoading={isLoading}
      searchBarPlaceholder="Type PowerShell command and press Enter"
      throttle={true}
    >
      <List.EmptyView
        title="PowerShell Terminal"
        description="Enter commands above and see them executed below"
        icon="🖥️"
      />

      {command.trim() && (
        <List.Item
          title={`> ${command}`}
          subtitle="Press Enter to execute"
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
                  // When user is typing, prioritize execute action
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
                  // When no command typed, prioritize view full output
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
