import { Color, getPreferenceValues, List, showToast, Toast, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionOnWorkflow } from "./components/action-on-workflow";
import { EmptyView } from "./components/empty-view";
import { DetailView } from "./components/detail-view";
import { filterTag } from "./utils/constants";
import { getAllWorkflowsAPI } from "./utils/n8n-api-utils"; // Corrected path
import { Workflow } from "./types/types"; // Corrected path
import { getIsShowDetail } from "./hooks/hooks";
import { ActionOpenPreferences } from "./components/action-open-preferences"; // Import custom action

// Define the preferences interface matching package.json
interface Preferences {
  instanceUrl: string;
  apiKey: string;
  rememberFilter: boolean;
}

export default function SearchWorkflowsCommand() {
  const { instanceUrl, apiKey, rememberFilter } = getPreferenceValues<Preferences>();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(filterTag[0].value); // Default to "All"
  const [refresh, setRefresh] = useState<number>(0); // To trigger manual refresh
  const [refreshDetail, setRefreshDetail] = useState<number>(0);
  const { showDetail } = getIsShowDetail(refreshDetail);

  useEffect(() => {
    async function fetchWorkflows() {
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
      setError(null); // Clear previous errors
      try {
        const fetchedWorkflows = await getAllWorkflowsAPI();
        setWorkflows(fetchedWorkflows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch workflows");
        // Toast is shown within fetchN8nApi, but we set local error state too
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [refresh, instanceUrl, apiKey]); // Re-fetch if refresh state or credentials change

  const filteredWorkflows = workflows.filter(workflow => {
    if (filter === filterTag[0].value) return true; // "All"
    if (filter === filterTag[1].value) return workflow.active; // "Active"
    if (filter === filterTag[2].value) return !workflow.active; // "Not Active"
    return false;
  });

  // Separate active and inactive after filtering
  const activeWorkflows = filteredWorkflows.filter(w => w.active);
  const inactiveWorkflows = filteredWorkflows.filter(w => !w.active);

  if (error && !loading) {
    return (
        <List>
            <List.EmptyView
                title="Failed to Load Workflows"
                description={error || "Check your API credentials and n8n instance connection."}
                icon={Icon.Warning}
                actions={
                    <ActionPanel>
                        <ActionOpenPreferences />
                        <Action title="Retry" icon={Icon.Repeat} onAction={() => setRefresh(Date.now())} />
                    </ActionPanel>
                }
            />
        </List>
    );
  }


  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail && filteredWorkflows.length > 0}
      searchBarPlaceholder={"Search workflows"}
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"} storeValue={rememberFilter} defaultValue={filter}>
          {filterTag.map((tag) => (
            <List.Dropdown.Item key={tag.value} title={tag.title} value={tag.value} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredWorkflows.length === 0 && !loading ? (
         <EmptyView title={"No Workflows Found"} extensionPreferences={false} />
      ) : (
        <>
          <List.Section title={"Active"} subtitle={`${activeWorkflows.length} workflow(s)`}>
            {activeWorkflows.map((workflow) => (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: Color.Green }}
                key={workflow.id} // Use stable ID
                title={workflow.name}
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionOnWorkflow
                    workflow={workflow}
                    // Pass setRefresh to allow actions to trigger a list refresh
                    setRefresh={() => setRefresh(Date.now())}
                    setRefreshDetail={setRefreshDetail}
                    showDetail={showDetail}
                  />
                }
              />
            ))}
          </List.Section>
          <List.Section title={"Inactive"} subtitle={`${inactiveWorkflows.length} workflow(s)`}>
            {inactiveWorkflows.map((workflow) => (
              <List.Item
                icon={{ source: "list-icon.svg" }} // No tint for inactive
                key={workflow.id} // Use stable ID
                title={workflow.name}
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionOnWorkflow
                    workflow={workflow}
                    setRefresh={() => setRefresh(Date.now())}
                    setRefreshDetail={setRefreshDetail}
                    showDetail={showDetail}
                  />
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
