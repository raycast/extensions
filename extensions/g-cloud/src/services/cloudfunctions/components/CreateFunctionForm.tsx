import { ActionPanel, Action, Form, showToast, Toast, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import { spawn } from "child_process";
import { RUNTIMES, MEMORY_OPTIONS, CLOUD_FUNCTIONS_REGIONS } from "../types";

interface CreateFunctionFormProps {
  projectId: string;
  gcloudPath: string;
  onCreated: () => void;
}

interface FormValues {
  sourcePath: string[];
  functionName: string;
  runtime: string;
  entryPoint: string;
  region: string;
  memory: string;
  timeout: string;
  minInstances: string;
  maxInstances: string;
  allowUnauthenticated: boolean;
}

export function CreateFunctionForm({ projectId, gcloudPath, onCreated }: CreateFunctionFormProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployComplete, setDeployComplete] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const { pop } = useNavigation();

  // Form validation
  const [nameError, setNameError] = useState<string | undefined>();

  function validateFunctionName(name: string): boolean {
    if (!name) {
      setNameError("Function name is required");
      return false;
    }
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) && name.length > 1) {
      setNameError("Must start with letter, contain only lowercase letters, numbers, hyphens");
      return false;
    }
    if (name.length < 2) {
      setNameError("Must be at least 2 characters");
      return false;
    }
    if (name.length > 63) {
      setNameError("Must be 63 characters or less");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  async function handleSubmit(values: FormValues) {
    // Validate
    if (!values.sourcePath || values.sourcePath.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Source path is required" });
      return;
    }

    if (!validateFunctionName(values.functionName)) {
      return;
    }

    if (!values.entryPoint.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Entry point is required" });
      return;
    }

    setIsDeploying(true);
    setDeployLogs([]);
    setDeployError(null);
    setDeployedUrl(null);

    const sourcePath = values.sourcePath[0];

    // Build gcloud command
    const args = [
      "functions",
      "deploy",
      values.functionName,
      "--gen2",
      "--runtime",
      values.runtime,
      "--region",
      values.region,
      "--source",
      sourcePath,
      "--entry-point",
      values.entryPoint,
      "--trigger-http",
      "--memory",
      values.memory,
      "--timeout",
      `${values.timeout}s`,
      "--min-instances",
      values.minInstances,
      "--max-instances",
      values.maxInstances,
      "--project",
      projectId,
    ];

    if (values.allowUnauthenticated) {
      args.push("--allow-unauthenticated");
    } else {
      args.push("--no-allow-unauthenticated");
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deploying function...",
      message: values.functionName,
    });

    try {
      const result = await runGcloudCommand(gcloudPath, args, (line) => {
        setDeployLogs((prev) => [...prev, line]);
      });

      if (result.success) {
        // Try to extract URL from output
        const urlMatch = result.output.match(/https:\/\/[^\s]+\.cloudfunctions\.net\/[^\s]+/);
        if (urlMatch) {
          setDeployedUrl(urlMatch[0]);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Function deployed!";
        toast.message = values.functionName;

        setDeployComplete(true);
        onCreated();
      } else {
        setDeployError(result.error || "Deployment failed");
        toast.style = Toast.Style.Failure;
        toast.title = "Deployment failed";
        toast.message = result.error;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setDeployError(errorMsg);
      toast.style = Toast.Style.Failure;
      toast.title = "Deployment failed";
      toast.message = errorMsg;
    } finally {
      setIsDeploying(false);
    }
  }

  // Show deployment progress
  if (isDeploying || deployComplete || deployError) {
    const recentLogs = deployLogs.slice(-20).join("\n");

    let markdown: string;
    if (deployComplete) {
      markdown = `# Deployment Complete!

${deployedUrl ? `**Function URL:** ${deployedUrl}` : "Function deployed successfully."}

## Deployment Logs
\`\`\`
${recentLogs || "No logs available"}
\`\`\`
`;
    } else if (deployError) {
      markdown = `# Deployment Failed

**Error:** ${deployError}

## Deployment Logs
\`\`\`
${recentLogs || "No logs available"}
\`\`\`
`;
    } else {
      markdown = `# Deploying...

Please wait while your function is being deployed. This may take a few minutes.

## Deployment Logs
\`\`\`
${recentLogs || "Starting deployment..."}
\`\`\`
`;
    }

    return (
      <Detail
        isLoading={isDeploying}
        markdown={markdown}
        navigationTitle="Deploying Function"
        actions={
          <ActionPanel>
            {deployComplete && deployedUrl && <Action.OpenInBrowser title="Open Function URL" url={deployedUrl} />}
            {deployComplete && <Action title="Done" onAction={pop} />}
            {deployError && (
              <Action
                title="Try Again"
                onAction={() => {
                  setDeployError(null);
                  setDeployLogs([]);
                }}
              />
            )}
            {deployError && <Action title="Cancel" onAction={pop} />}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Create Cloud Function"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Deploy Function" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Deploy a new Cloud Function (Gen 2) with HTTP trigger." />

      <Form.FilePicker
        id="sourcePath"
        title="Source Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        info="Select the directory containing your function source code"
      />

      <Form.TextField
        id="functionName"
        title="Function Name"
        placeholder="my-function"
        error={nameError}
        onChange={(value) => validateFunctionName(value)}
        info="Must be lowercase letters, numbers, and hyphens"
      />

      <Form.Dropdown id="runtime" title="Runtime" defaultValue="nodejs20">
        {RUNTIMES.map((runtime) => (
          <Form.Dropdown.Item key={runtime.id} value={runtime.id} title={runtime.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="entryPoint"
        title="Entry Point"
        placeholder="handler"
        defaultValue="handler"
        info="The name of the exported function to invoke"
      />

      <Form.Dropdown id="region" title="Region" defaultValue="us-central1">
        {CLOUD_FUNCTIONS_REGIONS.map((region) => (
          <Form.Dropdown.Item key={region.value} value={region.value} title={region.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="memory" title="Memory" defaultValue="256Mi">
        {MEMORY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="timeout" title="Timeout (seconds)" defaultValue="60" info="Maximum execution time (1-540)" />

      <Form.TextField
        id="minInstances"
        title="Min Instances"
        defaultValue="0"
        info="Minimum number of instances (0 = scale to zero)"
      />

      <Form.TextField id="maxInstances" title="Max Instances" defaultValue="100" info="Maximum number of instances" />

      <Form.Separator />

      <Form.Checkbox
        id="allowUnauthenticated"
        label="Allow unauthenticated invocations"
        defaultValue={true}
        info="If enabled, anyone can call this function without authentication"
      />
    </Form>
  );
}

// Helper function to run gcloud command with streaming output
function runGcloudCommand(
  gcloudPath: string,
  args: string[],
  onLine: (line: string) => void,
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(gcloudPath, args, {
      env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1" },
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      text.split("\n").forEach((line: string) => {
        if (line.trim()) onLine(line.trim());
      });
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      // gcloud often writes progress to stderr
      text.split("\n").forEach((line: string) => {
        if (line.trim()) onLine(line.trim());
      });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: output + errorOutput });
      } else {
        resolve({
          success: false,
          output: output + errorOutput,
          error: errorOutput || `Exit code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: "", error: err.message });
    });
  });
}
