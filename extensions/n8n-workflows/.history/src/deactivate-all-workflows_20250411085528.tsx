import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getAllWorkflowsAPI, activateWorkflowAPI } from "./utils/n8n-api-utils";
import { Workflow } from "./types/types";

// Define the preferences interface matching package.json
interface Preferences {
  instanceUrl: string;
  apiKey: string;
}

export default async () => {
  const { instanceUrl, apiKey } = getPreferenceValues<Preferences>();

  if (!instanceUrl || !apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing Preferences",
      message: "Please set your n8n Instance URL and API Key in the command preferences.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching workflows...",
  });

  try {
    const allWorkflows = await getAllWorkflowsAPI();
    const activeWorkflows = allWorkflows.filter((wf: Workflow) => wf.active); // Filter for active workflows

    if (activeWorkflows.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "All workflows already inactive";
      return;
    }

    toast.title = `Deactivating ${activeWorkflows.length} workflow(s)...`;

    let successCount = 0;
    let failureCount = 0;

    // Deactivate workflows sequentially
    for (const workflow of activeWorkflows) {
      try {
        await activateWorkflowAPI(String(workflow.id), false); // Set active to false
        successCount++;
      } catch (e) {
        console.error(`Failed to deactivate workflow ${workflow.id} (${workflow.name}):`, e);
        failureCount++;
      }
    }

    if (failureCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Successfully deactivated ${successCount} workflow(s).`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Deactivation complete: ${successCount} succeeded, ${failureCount} failed.`;
      toast.message = "Check console log for details on failures.";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to deactivate workflows";
    toast.message = error instanceof Error ? error.message : String(error);
  }
};
