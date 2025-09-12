import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Form, showToast, Toast, Detail, confirmAlert, Alert } from "@raycast/api";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runArtisan, cleanupRunningProcesses } from "../lib/artisan";
import { validateArtisanCommand } from "../lib/commandValidator";
import { formatProjectInfo } from "../lib/projectDisplay";

interface FormValues {
  command: string;
}

export default function RunArtisanCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load project info on mount
  useEffect(() => {
    async function loadProject() {
      const path = await findLaravelProjectRoot();
      setProjectPath(path);
    }
    loadProject();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cleanupRunningProcesses();
    };
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.command.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command Required",
        message: "Please enter an artisan command",
      });
      return;
    }

    // Validate the command
    const validation = validateArtisanCommand(values.command);
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command Not Available",
        message: validation.reason || "This command is not suitable for this interface",
      });
      return;
    }

    // Show confirmation dialog for destructive commands
    if (validation.reason && validation.reason.includes("⚠️")) {
      const confirmed = await confirmAlert({
        title: "Destructive Command Warning",
        message: `${validation.reason}\n\nThis command may delete or modify data. Are you sure you want to continue?`,
        primaryAction: {
          title: "Continue",
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

    setIsLoading(true);
    setOutput(null);
    setError(null);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Running: php artisan ${values.command}`,
      });

      const cwd = await findLaravelProjectRoot();
      if (!cwd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Laravel Project Found",
          message: "Please add a Laravel project first",
        });
        return;
      }

      const result = await runArtisan(values.command, cwd, {
        signal: abortControllerRef.current.signal,
        timeout: 120000, // 2 minute timeout
      });
      setOutput(result);

      await showToast({
        style: Toast.Style.Success,
        title: "Command Completed",
        message: `php artisan ${values.command} in ${formatProjectInfo(cwd)}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (output || error) {
    const content = error ? `**Error:**\n\n\`\`\`\n${error}\n\`\`\`` : `**Output:**\n\n\`\`\`\n${output}\n\`\`\``;

    return (
      <Detail
        markdown={content}
        actions={
          <ActionPanel>
            <Action
              title="Run Another Command"
              onAction={() => {
                setOutput(null);
                setError(null);
              }}
            />
            {isLoading && (
              <Action
                title="Cancel Operation"
                style={Action.Style.Destructive}
                onAction={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  setIsLoading(false);
                }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {projectPath && <Form.Description title="Active Project" text={formatProjectInfo(projectPath)} />}
      <Form.TextField
        id="command"
        title="Artisan Command"
        placeholder="migrate:fresh --seed"
        info="Enter the artisan command without 'php artisan' prefix"
      />
      <Form.Description text="Examples: migrate, optimize, cache:clear --tags=views, make:model User. Note: Interactive commands (tinker) and long-running processes (serve, queue:work) are not supported." />
    </Form>
  );
}
