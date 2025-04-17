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
    const inactiveWorkflows = allWorkflows.filter((wf: Workflow) => !wf.active);

    if (inactiveWorkflows.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "All workflows already active";
      return;
    }

    toast.title = `Activating ${inactiveWorkflows.length} workflow(s)...`;

    let successCount = 0;
    let failureCount = 0;

    // Activate workflows sequentially to avoid overwhelming the API
    for (const workflow of inactiveWorkflows) {
      try {
        await activateWorkflowAPI(String(workflow.id), true);
        successCount++;
      } catch (e) {
        console.error(`Failed to activate workflow ${workflow.id} (${workflow.name}):`, e);
        failureCount++;
      }
    }

    if (failureCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Successfully activated ${successCount} workflow(s).`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Activation complete: ${successCount} succeeded, ${failureCount} failed.`;
      toast.message = "Check console log for details on failures.";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to activate workflows";
    toast.message = error instanceof Error ? error.message : String(error);
  }
};
