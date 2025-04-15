import { useEffect, useState } from "react";
import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { Workflow } from "./types/types";
import { getAllWorkflowsAPI } from "./utils/n8n-api-utils";
import { getWebhookDetails } from "./utils/workflow-utils";
import { EmptyView } from "./components/empty-view";

// Define the preferences interface matching package.json
interface Preferences {
  instanceUrl: string;
  apiKey: string;
}

export default function SearchWebhookWorkflowsCommand() {
  const { instanceUrl, apiKey } = getPreferenceValues<Preferences>();

  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]); // Workflows after filtering
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<number>(0); // To trigger manual refresh

  useEffect(() => {
    async function loadAndFilterWorkflows() {
      console.log("Rendering SearchWebhookWorkflowsCommand");
      if (!instanceUrl || !apiKey) {
        setError("Missing API Credentials");
        setLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing Preferences",
          message: "Please set your n8n Instance URL and API Key in the command preferences.",
        });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 1. Load saved filters with validation
        // const storedFilters = await LocalStorage.getItem<string>(TRIGGER_FILTERS_KEY);
        // let currentFilters: string[] = [];
        
        // if (storedFilters) {
        //   try {
        //     const parsedFilters = JSON.parse(storedFilters);
          
        //     // Validate filters are in the expected format
        //     if (Array.isArray(parsedFilters)) {
          //       // Filter out non-string values
          //       currentFilters = parsedFilters.filter(item => typeof item === 'string');
            
          //       // If we found invalid items, save the cleaned version back
          //       if (currentFilters.length !== parsedFilters.length) {
          //         console.warn(`Found ${parsedFilters.length - currentFilters.length} invalid filter items, cleaning up`);
          //         await LocalStorage.setItem(TRIGGER_FILTERS_KEY, JSON.stringify(currentFilters));
          //       }
          //     } else {
          //       console.warn("Saved filters are not in array format, resetting");
          //       await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
          //     }
          //   } catch (parseError) {
          //     console.error("Failed to parse saved filters:", parseError);
          //     await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
          //   }
          // }
          
          // setActiveFilters(currentFilters); // Update state for UI indicator

        // 2. Fetch all workflows
        console.log("Fetching all workflows");
        const fetchedWorkflows = await getAllWorkflowsAPI();
        console.log(`Fetched ${fetchedWorkflows.length} workflows`);

        // 3. First filter for webhook triggers
        console.log("Filtering for webhook triggers");
        const webhookWorkflows = fetchedWorkflows.filter(wf => {
          const hasWebhook = getWebhookDetails(wf) !== null;
          console.log(`Workflow ${wf.name} (${wf.id}) has webhook: ${hasWebhook}`);
          return hasWebhook;
        });
        console.log(`Found ${webhookWorkflows.length} webhook workflows`);

        // 4. Then apply tag filters if any
        // if (currentFilters.length > 0) {
        //   const workflowsMatchingFilters = webhookWorkflows.filter(wf =>
        //     wf.tags?.some(tag => currentFilters.includes(tag.name)) ?? false
        //   );
        //   setFilteredWorkflows(workflowsMatchingFilters);
        // } else {
          // No filters set, show all webhook workflows
          console.log(`Setting filtered workflows: ${webhookWorkflows.length}`);
          setFilteredWorkflows(webhookWorkflows);
        // }

      } catch (e) {
        console.error("Error in SearchWebhookWorkflowsCommand:", e);
        setError(e instanceof Error ? e.message : "Failed to fetch workflows or apply filters");
      } finally {
        setLoading(false);
      }
    }

    loadAndFilterWorkflows();
  }, [instanceUrl, apiKey]);

  console.log("Error message:", error);
  
  return (
    <List isLoading={loading}>
      {filteredWorkflows.length > 0 ? (
        filteredWorkflows.map((workflow) => (
          <List.Item
            key={workflow.id}
            title={workflow.name}
            subtitle={getWebhookDetails(workflow)?.path || ""}
          />
        ))
      ) : (
        <EmptyView
          title={error ? "Failed to Load Workflows" : "No Webhook Workflows Found"}
          description={error || (loading ? "Loading..." : "No workflows with webhook triggers found")}
          extensionPreferences={false} // Don't show default pref action
          actions={null}
        />
      )}
    </List>
  );
}
