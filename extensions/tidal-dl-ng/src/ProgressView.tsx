import { ActionPanel, Action, Detail, Icon, Keyboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeStreamingCommand, getTidalCommand } from "./utils";

interface ProgressViewProps {
  title: string;
  command: string;
  onComplete?: (success: boolean, output: string) => void;
  onCancel?: () => void;
}

export default function ProgressView({ title, command, onComplete, onCancel }: ProgressViewProps) {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runCommand() {
      if (cancelled) return;

      try {
        // Use streaming command for all commands
        const result = await executeStreamingCommand(`${getTidalCommand()} ${command}`, {
          onOutput: (data) => {
            if (!cancelled) {
              console.log("ProgressView onOutput:", JSON.stringify(data));
              setOutput((prev) => prev + data);
            }
          },
          onError: (data) => {
            if (!cancelled) {
              console.log("ProgressView onError:", JSON.stringify(data));
              setOutput((prev) => prev + data);
            }
          },
          onExit: (code) => {
            if (!cancelled) {
              setIsRunning(false);
              setIsComplete(true);
              setSuccess(code === 0);
              onComplete?.(code === 0, output);
            }
          },
        });

        if (!cancelled) {
          setIsRunning(false);
          setIsComplete(true);
          setSuccess(result.success);
          onComplete?.(result.success, result.output);
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setOutput((prev) => prev + `\n\nError: ${errorMessage}`);
          setIsRunning(false);
          setIsComplete(true);
          setSuccess(false);
          onComplete?.(false, output + `\n\nError: ${errorMessage}`);
        }
      }
    }

    runCommand();

    return () => {
      cancelled = true;
    };
  }, [command, onComplete]);

  const getStatusIcon = () => {
    if (isRunning) return "⏳";
    if (success) return "✅";
    return "❌";
  };

  const getMarkdown = () => {
    const status = isRunning ? "Running..." : isComplete ? (success ? "Complete!" : "Failed") : "Starting...";

    return `# ${getStatusIcon()} ${title}

**Status:** ${status}

## Output
\`\`\`
${output || "Waiting for output..."}
\`\`\`

${isRunning ? "*Press Cmd+C to cancel*" : ""}
`;
  };

  const getActions = () => {
    return (
      <ActionPanel>
        {isComplete && <Action.CopyToClipboard title="Copy Output" content={output} />}
        <Action
          title="Close"
          icon={Icon.XMarkCircle}
          shortcut={Keyboard.Shortcut.Common.Close}
          onAction={() => {
            onCancel?.();
          }}
        />
      </ActionPanel>
    );
  };

  return <Detail markdown={getMarkdown()} isLoading={isRunning && !output} actions={getActions()} />;
}
