import { Color, getPreferenceValues, List, showToast, Toast, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionOnWorkflow } from "./components/action-on-workflow";
import { EmptyView } from "./components/empty-view";
import { DetailView } from "./components/detail-view";
// Removed import for filterTag from "./utils/constants";
import { getAllWorkflowsAPI, getAllTagsAPI, Tag } from "./utils/n8n-api-utils"; // Added getAllTagsAPI, Tag
import { Workflow } from "./types/types";
import { getIsShowDetail } from "./hooks/hooks";
import { ActionOpenPreferences } from "./components/action-open-preferences";

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
  const [tags, setTags] = useState<Tag[]>([]); // State for fetched tags
  const [filter, setFilter] = useState<string>("all"); // Default to "all", representing All Tags
  const [refresh, setRefresh] = useState<number>(0);
  const [refreshDetail, setRefreshDetail] = useState<number>(0);
  const { showDetail } = getIsShowDetail(refreshDetail);

  useEffect(() => {
    async function fetchData() { // Renamed function
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
        // Fetch workflows and tags concurrently
        const [fetchedWorkflows, fetchedTags] = await Promise.all([
          getAllWorkflowsAPI(),
          getAllTagsAPI() // Fetch tags
        ]);
        setWorkflows(fetchedWorkflows);
        setTags(fetchedTags); // Set tags state
      } catch (e) {
        // Error handling might need refinement if one fails but not the other
        setError(e instanceof Error ? e.message : "Failed to fetch data");
        // Toasts are shown within the API utils for specific errors
      } finally {
        setLoading(false);
      }
    }

    fetchData(); // Call renamed function
  }, [refresh, instanceUrl, apiKey]);

  // Filter workflows based on the selected tag name
  const filteredWorkflows = workflows.filter(workflow => {
    if (filter === "all") return true; // "All Tags" selected
    // Assuming workflow.tags is an array of tag names (strings)
    // Adjust if workflow.tags contains tag IDs or objects
    return Array.isArray(workflow.tags) && workflow.tags.includes(filter);
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
        <List.Dropdown onChange={setFilter} tooltip={"Filter by Tag"} storeValue={rememberFilter} defaultValue={filter}>
          <List.Dropdown.Item key="all" title="All Tags" value="all" />
          {tags.map((tag) => (
            // Use tag name for both key and value, assuming names are unique enough for filtering
            <List.Dropdown.Item key={tag.name} title={tag.name} value={tag.name} />
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
