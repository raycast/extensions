import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface WorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.WorkItemType": string;
    "System.State": string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.TeamProject": string;
  };
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [workItemId, setWorkItemId] = useState("");
  const [workItemDetails, setWorkItemDetails] = useState<WorkItem | null>(null);
  const [workItemUrl, setWorkItemUrl] = useState<string>("");
  const [suggestedBranchName, setSuggestedBranchName] = useState<string>("");

  async function fetchWorkItem(workItemId: string) {
    if (!workItemId) return;

    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      // Fetch work item details
      let fetchCommand = `${azCommand} boards work-item show --id ${workItemId} --output json`;

      if (preferences.azureOrganization) {
        fetchCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      // Note: az boards work-item show doesn't support --project parameter
      // The project is determined from the work item ID itself

      const { stdout: workItemJson } = await execAsync(fetchCommand);
      const workItem: WorkItem = JSON.parse(workItemJson);
      setWorkItemDetails(workItem);

      // Generate URLs (only if organization is configured)
      const projectFromWorkItem = workItem.fields["System.TeamProject"];
      const projectToUse =
        projectFromWorkItem || preferences.azureProject || "Unknown";

      const organizationUrl = preferences.azureOrganization;
      if (organizationUrl) {
        const workItemUrl = `${organizationUrl}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItemId}`;
        setWorkItemUrl(workItemUrl);
      }

      // Generate suggested branch name
      const title = workItem.fields["System.Title"];
      const branchName = convertToBranchName(
        workItemId,
        title,
        preferences.branchPrefix,
      );
      setSuggestedBranchName(branchName);

      await showToast(
        Toast.Style.Success,
        "Loaded!",
        `Work item ${workItemId} details fetched`,
      );
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to fetch work item details",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-fetch when work item ID changes
  useEffect(() => {
    if (workItemId && workItemId.length > 0) {
      const timeoutId = setTimeout(() => {
        fetchWorkItem(workItemId);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      // Clear results when input is cleared
      setWorkItemDetails(null);
      setWorkItemUrl("");
      setSuggestedBranchName("");
    }
  }, [workItemId]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Work Item"
            onAction={() => fetchWorkItem(workItemId)}
            icon="🔄"
          />
          {workItemUrl && (
            <Action.OpenInBrowser
              title="Open Work Item (⌘I)"
              url={workItemUrl}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {suggestedBranchName && (
            <Action.CopyToClipboard
              title="Copy Branch Name (⌘B)"
              content={suggestedBranchName}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workItemId"
        title="Work Item ID"
        placeholder="Enter work item ID (e.g., 99)"
        value={workItemId}
        onChange={setWorkItemId}
      />

      {workItemDetails && (
        <>
          <Form.Description
            title="📋 Work Item"
            text={`#${workItemDetails.id}: ${workItemDetails.fields["System.Title"]}`}
          />
          <Form.Description
            title="📊 Current State"
            text={workItemDetails.fields["System.State"]}
          />
          <Form.Description
            title="📁 Type"
            text={workItemDetails.fields["System.WorkItemType"]}
          />
          <Form.Description
            title="🏢 Project"
            text={workItemDetails.fields["System.TeamProject"]}
          />
          {workItemDetails.fields["System.AssignedTo"] && (
            <Form.Description
              title="👤 Assigned To"
              text={workItemDetails.fields["System.AssignedTo"].displayName}
            />
          )}
        </>
      )}

      {workItemUrl && (
        <Form.Description
          title="📋 Work Item URL (⌘I to open)"
          text={workItemUrl}
        />
      )}

      {suggestedBranchName && (
        <Form.Description
          title="🌿 Suggested Branch Name (⌘B to copy)"
          text={suggestedBranchName}
        />
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
