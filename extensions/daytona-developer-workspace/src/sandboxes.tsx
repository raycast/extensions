/**
 * Daytona Dashboard Command
 * Task 11: Complete sandbox management interface
 * REFACTORED: Now using the new architecture with centralized types and components
 */

import {
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  launchCommand,
  LaunchType,
  Clipboard,
  open,
} from "@raycast/api";
import { getDaytonaClient } from "./lib/daytona-client";
import { invalidateSandboxCaches } from "./utils/cache";
import { handleDaytonaError } from "./lib/error-handler";
import { useDaytonaApi } from "./hooks/useDaytonaApi";

// NEW: Import centralized types and components
import { Sandbox, SandboxStatus, SandboxActions } from "./types/sandbox";
import type { CreateSandboxForm } from "./types/sandbox";
import { LoadingView, EmptyState, ErrorView } from "./components/common";
import { SandboxItem } from "./components/sandbox";
import { MESSAGES } from "./lib/constants/ui";

// Map Daytona API status values to our expected status values
const mapDaytonaStatus = (daytonaStatus: string | undefined): SandboxStatus => {
  if (!daytonaStatus) return "stopped";

  // Log the actual status for debugging
  console.log(`Mapping Daytona status: "${daytonaStatus}"`);

  const status = daytonaStatus.toLowerCase();
  switch (status) {
    case "running":
    case "active":
    case "started": // Daytona uses 'started' for running sandboxes
      return "running";
    case "stopped":
    case "inactive":
    case "paused":
      return "stopped";
    case "creating":
    case "starting":
    case "initializing":
    case "building":
      return "creating";
    case "deleting":
    case "removing":
    case "destroying":
      return "deleting";
    default:
      console.warn(`Unknown Daytona status: "${daytonaStatus}", defaulting to stopped`);
      return "stopped";
  }
};

// Create Sandbox Form Component
function CreateSandboxForm({ onCreate }: { onCreate: (values: CreateSandboxForm) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Sandbox"
            icon={Icon.Plus}
            onSubmit={(values: CreateSandboxForm) => {
              onCreate(values);
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Sandbox Name"
        placeholder="my-project"
        info="Optional: Leave empty to auto-generate"
      />
      <Form.TextField
        id="repository"
        title="Git Repository"
        placeholder="https://github.com/user/python-project.git"
        info="Optional: Git repository URL to clone after creation. Best suited for Python projects since sandbox runs Python environment."
      />
    </Form>
  );
}

// Main Dashboard Component
function DashboardCommand() {
  const { push } = useNavigation();

  // Use the custom hook for API operations
  const {
    data: rawSandboxes,
    isLoading,
    error,
    reload: loadSandboxes,
  } = useDaytonaApi(async () => {
    let client;
    try {
      client = getDaytonaClient();
    } catch (error) {
      // Check if it's specifically an API key error
      if (error instanceof Error && error.message.includes("API key")) {
        throw new Error("🔑 API key required: Configure your Daytona API key in extension preferences");
      }
      throw new Error("Please configure your Daytona API key in extension settings");
    }

    if (!client) {
      throw new Error("Failed to initialize Daytona client. Please check your settings.");
    }

    // Use the correct Daytona SDK public method: list()
    const apiSandboxes = await client.list();

    // Debug: Log actual sandbox data to understand status mapping and repository structure
    if (apiSandboxes.length > 0) {
      console.log("Sample sandbox data:", apiSandboxes[0]);
      console.log(
        "All sandbox data:",
        apiSandboxes.map((sb) => ({
          id: sb.id,
          state: sb.state,
          name: sb.id, // Note: Daytona API doesn't store custom names, uses ID
        })),
      );
    }

    // Map API response to our interface with correct field names from Daytona API
    return apiSandboxes.map((apiSandbox): Sandbox => {
      return {
        id: apiSandbox.id || `unknown-${Date.now()}`,
        name: apiSandbox.id?.substring(0, 8) || "Unknown Sandbox", // Use first 8 chars of ID as name
        status: mapDaytonaStatus(apiSandbox.state) || "stopped", // Use 'state' field
        repository: undefined, // Repository info not stored in sandbox metadata, will be populated after cloning
        createdAt: apiSandbox.createdAt || new Date().toISOString(),
        updatedAt: apiSandbox.updatedAt || undefined,
      };
    });
  }, []);

  const sandboxes = rawSandboxes || [];

  const handleSandboxAction_Legacy = async (action: string, sandboxId: string) => {
    const sandbox = sandboxes.find((sb) => sb.id === sandboxId);
    if (!sandbox) return;

    try {
      showToast({
        style: Toast.Style.Animated,
        title: `${action === "start" ? "Starting" : action === "stop" ? "Stopping" : "Deleting"} Sandbox`,
        message: sandbox.name,
      });

      const client = getDaytonaClient();

      switch (action) {
        case "start": {
          // Only start if not already running
          if (sandbox.status === "running") {
            showToast({
              style: Toast.Style.Failure,
              title: "Already Running",
              message: `Sandbox "${sandbox.name}" is already running`,
            });
            return;
          }
          // Get sandbox instance and start it
          const sandboxToStart = await client.get(sandboxId);
          await client.start(sandboxToStart);
          break;
        }
        case "stop": {
          // Only stop if currently running
          if (sandbox.status === "stopped") {
            showToast({
              style: Toast.Style.Failure,
              title: "Already Stopped",
              message: `Sandbox "${sandbox.name}" is already stopped`,
            });
            return;
          }
          // Get sandbox instance and stop it
          const sandboxToStop = await client.get(sandboxId);
          await client.stop(sandboxToStop);
          break;
        }
        case "delete": {
          console.log(`Attempting to delete sandbox: ${sandboxId}`);

          // Get sandbox instance and delete it
          const sandboxToDelete = await client.get(sandboxId);
          await client.delete(sandboxToDelete);

          invalidateSandboxCaches();
          break;
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Sandbox ${action}${action.endsWith("e") ? "d" : "ed"} successfully`,
      });

      // Refresh the data after a small delay to allow API to update
      setTimeout(() => {
        loadSandboxes();
      }, 1000);
    } catch (error) {
      await handleDaytonaError(error, `${action} sandbox`);
    }
  };

  const handleCreateSandbox = async (values: CreateSandboxForm) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Creating Sandbox",
        message: values.name || "New sandbox",
      });

      const client = getDaytonaClient();

      // Use the correct Daytona SDK public method: create()
      const createParams = {
        language: "python" as const, // Set default language for code execution
      };

      console.log("Creating sandbox with params:", createParams);

      const sandbox = await client.create(createParams);
      console.log("Created sandbox:", sandbox);

      showToast({
        style: Toast.Style.Success,
        title: "Sandbox Created",
        message: sandbox.id.substring(0, 8),
      });

      // If repository URL is provided, clone it after sandbox creation
      if (values.repository && values.repository.trim()) {
        try {
          showToast({
            style: Toast.Style.Animated,
            title: "Cloning Repository",
            message: "This may take a moment...",
          });

          // Wait for sandbox to be fully started before cloning
          console.log("Waiting for sandbox to start before cloning repository...");
          await sandbox.waitUntilStarted();

          // Clone repository into workspace directory using process execution
          console.log(`Cloning repository: ${values.repository} to workspace/`);
          const cloneResult = await sandbox.process.codeRun(
            `
import subprocess
import json
import os

try:
    # Get the home directory (should be /home/daytona)
    home_dir = os.path.expanduser('~')
    workspace_dir = os.path.join(home_dir, 'workspace')
    
    # Create workspace directory in home if it doesn't exist
    os.makedirs(workspace_dir, exist_ok=True)
    print(f"Created workspace directory: {workspace_dir}")
    
    # Clone repository to workspace directory
    repo_name = '${values.repository}'.split('/')[-1].replace('.git', '')
    repo_path = os.path.join(workspace_dir, repo_name)
    
    result = subprocess.run([
        'git', 'clone', '${values.repository}', repo_path
    ], capture_output=True, text=True, cwd=workspace_dir)
    
    print(f"Git clone exit code: {result.returncode}")
    print(f"Git clone stdout: {result.stdout}")
    print(f"Git clone stderr: {result.stderr}")
    
    if result.returncode != 0:
        print(json.dumps({
            "success": False, 
            "error": f"Git clone failed: {result.stderr}",
            "stdout": result.stdout,
            "stderr": result.stderr
        }))
    else:
        # Verify files were created
        repo_files = os.listdir(repo_path) if os.path.exists(repo_path) else []
        print(json.dumps({
            "success": True, 
            "message": "Repository cloned successfully",
            "repo_path": repo_path,
            "workspace_dir": workspace_dir,
            "file_count": len(repo_files)
        }))
        
except Exception as e:
    print(json.dumps({"success": False, "error": f"Clone operation failed: {str(e)}"}))
          `.trim(),
          );

          // Parse the result and provide feedback
          try {
            interface ExecutionResult {
              result?: string;
              stdout?: string;
              stderr?: string;
              exitCode?: number;
            }
            const output = (cloneResult as ExecutionResult).result || (cloneResult as ExecutionResult).stdout || "";
            const lines = output.split("\n");
            const lastLine = lines[lines.length - 1] || lines[lines.length - 2] || "";

            if (lastLine.includes("{")) {
              const result = JSON.parse(lastLine);
              if (!result.success) {
                throw new Error(result.error || "Git clone failed");
              }
            }
          } catch (error) {
            console.error("Git clone error:", error);
            await handleDaytonaError(error, "cloning repository");
            return;
          }

          showToast({
            style: Toast.Style.Success,
            title: "Repository Cloned",
            message: "Repository cloned successfully",
          });
        } catch (cloneError) {
          console.error("Repository clone failed:", cloneError);
          await handleDaytonaError(cloneError, "cloning repository");
          // Show additional info that sandbox is still available
          showToast({
            style: Toast.Style.Success,
            title: "Sandbox Created",
            message: "Repository clone failed, but sandbox is still available for use",
          });
        }
      }

      invalidateSandboxCaches();

      // Refresh the data after a small delay to allow API to update
      setTimeout(() => {
        loadSandboxes();
      }, 1500);
    } catch (error) {
      await handleDaytonaError(error, "creating sandbox");
    }
  };

  // NEW: Enhanced sandbox actions using centralized types
  const handleSandboxAction = async (action: keyof SandboxActions, sandbox: Sandbox) => {
    switch (action) {
      case "start":
        handleSandboxAction_Legacy("start", sandbox.id);
        break;
      case "stop":
        handleSandboxAction_Legacy("stop", sandbox.id);
        break;
      case "restart":
        handleSandboxAction_Legacy("restart", sandbox.id);
        break;
      case "delete":
        handleSandboxAction_Legacy("delete", sandbox.id);
        break;
      case "openFiles":
        launchCommand({ name: "files", type: LaunchType.UserInitiated, context: { sandboxId: sandbox.id } });
        break;
      case "openGitManager":
        launchCommand({ name: "git-manager", type: LaunchType.UserInitiated, context: { sandboxId: sandbox.id } });
        break;
      case "clone":
        // For now, open the Create Sandbox form to let the user duplicate settings manually
        push(<CreateSandboxForm onCreate={handleCreateSandbox} />);
        break;
      case "copyId":
        await Clipboard.copy(sandbox.id);
        showToast({ style: Toast.Style.Success, title: "Copied", message: "Sandbox ID copied to clipboard" });
        break;
      case "openInBrowser":
        await open(`https://22222-${sandbox.id}.proxy.daytona.work/`);
        showToast({ style: Toast.Style.Success, title: "Opening", message: "Opening sandbox web terminal" });
        break;
    }
  };

  // NEW: Using our enhanced architecture
  if (isLoading) {
    return <LoadingView message={MESSAGES.LOADING.SANDBOXES} />;
  }

  if (error) {
    return <ErrorView error={error} onRetry={loadSandboxes} />;
  }

  return (
    <List searchBarPlaceholder="Search sandboxes...">
      {sandboxes.length === 0 ? (
        <EmptyState
          type="sandbox"
          actions={[
            {
              id: "create",
              title: "Create Sandbox",
              icon: Icon.Plus,
              action: () => push(<CreateSandboxForm onCreate={handleCreateSandbox} />),
            },
          ]}
        />
      ) : (
        <List.Section title={`Daytona Sandboxes (${sandboxes.length})`}>
          {sandboxes.map((sandbox) => (
            <SandboxItem
              key={sandbox.id}
              sandbox={sandbox}
              onAction={(action) => handleSandboxAction(action, sandbox)}
              showRepository={true}
              showMetadata={false}
              customActions={[
                {
                  id: "create",
                  title: "Create Sandbox",
                  icon: Icon.Plus,
                  onAction: () => push(<CreateSandboxForm onCreate={handleCreateSandbox} />),
                },
                {
                  id: "refresh",
                  title: "Refresh",
                  icon: Icon.ArrowClockwise,
                  shortcut: { modifiers: ["cmd"], key: "r" },
                  onAction: loadSandboxes,
                },
                {
                  id: "openDashboard",
                  title: "Open Daytona Dashboard",
                  icon: Icon.Globe,
                  onAction: () => open("https://app.daytona.io/dashboard/sandboxes"),
                },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default DashboardCommand;
