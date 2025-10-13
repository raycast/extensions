import { ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

interface CommandOutputProps {
  command: string;
  projectId: string;
  gcloudPath: string;
}

export default function CommandOutput({ command, projectId, gcloudPath }: CommandOutputProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    executeCommand();
  }, [command, projectId, gcloudPath]);

  async function executeCommand() {
    setIsLoading(true);
    try {
      const fullCommand = `${gcloudPath} ${command} --project=${projectId} --format=json`;
      const { stdout } = await execPromise(fullCommand);

      try {
        const jsonOutput = JSON.parse(stdout);
        setOutput("```json\n" + JSON.stringify(jsonOutput, null, 2) + "\n```");
      } catch {
        setOutput("```\n" + stdout + "\n```");
      }

      showToast({ style: Toast.Style.Success, title: "Command executed successfully" });
    } catch (err) {
      const error = err as Error;
      showFailureToast({
        title: "Failed to execute command",
        message: error.message,
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = error
    ? `# Error\n\n${error}\n\n\`\`\`\n${command}\n\`\`\``
    : `# Command Output\n\n**Command:** \`${command} --project=${projectId}\`\n\n${output}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Run Again" onAction={executeCommand} />
        </ActionPanel>
      }
    />
  );
}
