import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
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
  const [currentUser, setCurrentUser] = useState<string>("");
  const [branchUrl, setBranchUrl] = useState<string>("");
  const [workItemUrl, setWorkItemUrl] = useState<string>("");

  async function getCurrentUser() {
    try {
      const azCommand = "/opt/homebrew/bin/az";
      const { stdout } = await execAsync(
        `${azCommand} account show --query user.name -o tsv`,
      );
      return stdout.trim();
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }

  async function activateAndBranch(workItemId: string) {
    if (!workItemId) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Please enter a work item ID",
      );
      return;
    }

    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Could not determine current Azure user");
      }
      setCurrentUser(user);

      // Step 1: Fetch work item details (without project first to get the project from work item)
      let fetchCommand = `${azCommand} boards work-item show --id ${workItemId} --output json`;

      if (preferences.azureOrganization) {
        fetchCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      // Try with configured project first, if available
      if (preferences.azureProject) {
        fetchCommand += ` --project "${preferences.azureProject}"`;
      }

      const { stdout: workItemJson } = await execAsync(fetchCommand);
      const workItem: WorkItem = JSON.parse(workItemJson);
      setWorkItemDetails(workItem);

      // Get the project from the work item (this is more reliable than preferences)
      const projectFromWorkItem = workItem.fields["System.TeamProject"];
      const projectToUse = projectFromWorkItem || preferences.azureProject;

      if (!projectToUse) {
        await showToast(
          Toast.Style.Failure,
          "Configuration Error",
          "Could not determine project - please configure Azure DevOps Project in settings",
        );
        return;
      }

      // Try to determine repository - often the repository name matches the project name
      // or we can try to list repositories in the project to find the default one
      let repositoryToUse = preferences.azureRepository;

      if (!repositoryToUse) {
        // Try using project name as repository name (common pattern)
        repositoryToUse = projectToUse;
        console.log(
          `No repository configured, trying project name: ${repositoryToUse}`,
        );
      }

      // Step 2: Update work item to Active and assign to self
      let updateCommand = `${azCommand} boards work-item update --id ${workItemId}`;
      updateCommand += ` --state "Active"`;
      updateCommand += ` --assigned-to "${user}"`;

      if (preferences.azureOrganization) {
        updateCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      // Note: work-item update doesn't support --project parameter
      // It uses the organization context or default configuration

      await execAsync(updateCommand);

      // Step 3: Generate branch name
      const title = workItem.fields["System.Title"];
      const branchName = convertToBranchName(
        workItemId,
        title,
        preferences.branchPrefix,
      );

      // Step 4: Get the object ID of the source branch
      let getObjectIdCommand = `${azCommand} repos ref list --filter "heads/${preferences.sourceBranch}" --query "[0].objectId" -o tsv`;
      getObjectIdCommand += ` --repository "${repositoryToUse}"`;

      if (preferences.azureOrganization) {
        getObjectIdCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      getObjectIdCommand += ` --project "${projectToUse}"`;

      const { stdout: objectId } = await execAsync(getObjectIdCommand);
      const trimmedObjectId = objectId.trim();

      if (!trimmedObjectId) {
        throw new Error(
          `Source branch '${preferences.sourceBranch}' not found`,
        );
      }

      // Step 5: Create branch in Azure DevOps
      let createBranchCommand = `${azCommand} repos ref create --name "refs/heads/${branchName}" --object-id "${trimmedObjectId}"`;
      createBranchCommand += ` --repository "${repositoryToUse}"`;

      if (preferences.azureOrganization) {
        createBranchCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      createBranchCommand += ` --project "${projectToUse}"`;

      await execAsync(createBranchCommand);

      // Generate URLs for easy access (only if organization is configured)
      const organizationUrl = preferences.azureOrganization;
      if (organizationUrl) {
        const branchUrl = `${organizationUrl}/${encodeURIComponent(projectToUse)}/_git/${encodeURIComponent(repositoryToUse)}?version=GB${encodeURIComponent(branchName)}`;
        const workItemUrl = `${organizationUrl}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItemId}`;

        setBranchUrl(branchUrl);
        setWorkItemUrl(workItemUrl);
      }

      await showToast(
        Toast.Style.Success,
        "Success!",
        `Work item ${workItemId} activated, assigned, and branch '${branchName}' created in Azure DevOps`,
      );
    } catch (error: unknown) {
      let errorMessage = "Failed to activate work item and create branch";

      if (error instanceof Error) {
        if (error.message.includes("az")) {
          errorMessage = "Azure CLI not found or not configured properly";
        } else if (error.message.includes("already exists")) {
          errorMessage = "Branch already exists in Azure DevOps";
        } else if (error.message.includes("repos")) {
          errorMessage =
            "Failed to create branch in Azure DevOps - check repository access";
        }
      }

      await showToast(Toast.Style.Failure, "Error", errorMessage);
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
            title="Activate & Create Branch"
            onAction={() => activateAndBranch(workItemId)}
            icon="🚀"
          />
          {workItemUrl && (
            <Action.OpenInBrowser
              title="Open Work Item (⌘I)"
              url={workItemUrl}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {branchUrl && (
            <>
              <Action.OpenInBrowser
                title="Open Branch (⌘O)"
                url={branchUrl}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Branch URL (⌘L)"
                content={branchUrl}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workItemId"
        title="Work Item ID"
        placeholder="Enter work item ID (e.g., 12345)"
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
          {workItemDetails.fields["System.AssignedTo"] && (
            <Form.Description
              title="👤 Currently Assigned To"
              text={workItemDetails.fields["System.AssignedTo"].displayName}
            />
          )}
        </>
      )}

      {currentUser && (
        <Form.Description title="🎯 Will Assign To" text={currentUser} />
      )}

      {workItemUrl && (
        <Form.Description
          title="📋 Work Item URL (⌘I to open)"
          text={workItemUrl}
        />
      )}

      {branchUrl && (
        <Form.Description
          title="🔗 Branch URL (⌘O to open, ⌘L to copy)"
          text={branchUrl}
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
