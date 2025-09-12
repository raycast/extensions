import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
}

interface WorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.WorkItemType": string;
  };
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [workItemTitle, setWorkItemTitle] = useState("");
  const [branchName, setBranchName] = useState("");
  const [currentWorkItemId, setCurrentWorkItemId] = useState("");

  async function fetchWorkItem(workItemId: string) {
    if (!workItemId) return;

    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      // Use full path to Azure CLI (common Homebrew locations)
      const azCommand = "/opt/homebrew/bin/az"; // Apple Silicon

      let command = `${azCommand} boards work-item show --id ${workItemId} --output json`;

      // Add organization parameter if specified in preferences
      if (preferences.azureOrganization) {
        command += ` --organization "${preferences.azureOrganization}"`;
      }

      // Note: az boards work-item show doesn't support --project parameter
      // The project is determined from the work item ID itself

      const { stdout } = await execAsync(command);
      const workItem: WorkItem = JSON.parse(stdout);
      const title = workItem.fields["System.Title"];
      setWorkItemTitle(title);

      // Generate and copy branch name immediately
      const generatedBranchName = convertToBranchName(
        workItemId,
        title,
        preferences.branchPrefix,
      );
      setBranchName(generatedBranchName);
      await Clipboard.copy(generatedBranchName);
      await showToast(Toast.Style.Success, "Copied!", `${generatedBranchName}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Azure CLI not found at /opt/homebrew/bin/az. Check installation.",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Fetch Work Item"
            onAction={() => fetchWorkItem(currentWorkItemId)}
            icon="🔍"
          />
          {branchName && (
            <Action.CopyToClipboard
              title="Copy Branch Name"
              content={branchName}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="number"
        title="Work Item Number"
        placeholder="Enter work item ID (e.g., 12345)"
        value={currentWorkItemId}
        onChange={(value) => {
          setCurrentWorkItemId(value);
          // Clear previous results when typing
          if (value !== currentWorkItemId) {
            setWorkItemTitle("");
            setBranchName("");
          }
        }}
      />

      {workItemTitle && (
        <Form.Description title="✅ Work Item Title" text={workItemTitle} />
      )}

      {branchName && (
        <Form.Description title="🌿 Generated Branch Name" text={branchName} />
      )}
    </Form>
  );
}

function convertToBranchName(
  number: string,
  description: string,
  prefix: string,
): string {
  const combined = `${number} ${description}`;
  const slug = combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${prefix}${slug}`;
}
