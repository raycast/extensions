import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runArtisan } from "../lib/artisan";

export default function RunTests() {
  const [isLoading, setIsLoading] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function executeTests() {
    setIsLoading(true);
    setOutput(null);
    setError(null);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Running Laravel Tests…" });
      const cwd = await findLaravelProjectRoot();
      if (!cwd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Laravel Project Found",
          message: "Please add a Laravel project first",
        });
        setError("No Laravel project found. Please add a project first.");
        return;
      }

      const result = await runArtisan("test", cwd);
      setOutput(result);

      await showToast({ style: Toast.Style.Success, title: "Tests Completed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      await showToast({ style: Toast.Style.Failure, title: "Tests Failed", message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    executeTests();
  }, []);

  const content = error
    ? `**Error:**\n\n\`\`\`\n${error}\n\`\`\``
    : output
      ? `**Output:**\n\n\`\`\`\n${output}\n\`\`\``
      : "Running tests…";

  return (
    <Detail
      markdown={content}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Run Tests Again" onAction={executeTests} />
        </ActionPanel>
      }
    />
  );
}
