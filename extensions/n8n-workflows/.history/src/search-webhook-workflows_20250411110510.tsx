import { Color, getPreferenceValues, List, showToast, Toast, Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionOnWorkflow } from "./components/action-on-workflow"; // Re-use the same actions
import { EmptyView } from "./components/empty-view";
import { DetailView } from "./components/detail-view";
import { getAllWorkflowsAPI } from "./utils/n8n-api-utils";
import { Workflow } from "./types/types";
import { getIsShowDetail } from "./hooks/hooks";
import { getWebhookDetails } from "./utils/workflow-utils";
import SaveCommandForm from "./components/SaveCommandForm";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import TriggerFilterForm from "./components/TriggerFilterForm";
import { TRIGGER_FILTERS_KEY, FILTER_APPLIED_INDICATOR } from "./utils/constants";

// Helper to get workflow URL (moved here from original implementation)
function getWorkflowUrl(instanceUrl: string, workflowId: number): string {
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  return `${baseUrl}/workflow/${workflowId}`;
}

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
  const [refreshDetail, setRefreshDetail] = useState<number>(0);
  const { showDetail } = getIsShowDetail(refreshDetail);
  const [activeFilters, setActiveFilters] = useState<string[]>([]); // Store loaded filters

  useEffect(() => {
    async function loadAndFilterWorkflows() {
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
        // 1. Load saved filters
        const storedFilters = await LocalStorage.getItem<string>(TRIGGER_FILTERS_KEY);
        const currentFilters = storedFilters ? JSON.parse(storedFilters) : [];
        setActiveFilters(currentFilters); // Update state for UI indicator

        // 2. Fetch all workflows
        const fetchedWorkflows = await getAllWorkflowsAPI();
        setAllWorkflows(fetchedWorkflows); // Store all fetched

        // 3. First filter for webhook triggers
        const webhookWorkflows = fetchedWorkflows.filter(wf => getWebhookDetails(wf) !== null);

        // 4. Then apply tag filters if any
        if (currentFilters.length > 0) {
          const workflowsMatchingFilters = webhookWorkflows.filter(wf =>
            wf.tags?.some(tag => currentFilters.includes(tag.name)) ?? [];
          );
          setFilteredWorkflows(workflowsMatchingFilters);
        } else {
          // No filters set, show all webhook workflows
          setFilteredWorkflows(webhookWorkflows);
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch workflows or apply filters");
      } finally {
        setLoading(false);
      }
    }

    loadAndFilterWorkflows();
  }, [refresh, instanceUrl, apiKey]); // Re-run on refresh or credential change

  // Separate active and inactive based on the *filtered* list
  const activeWorkflows = filteredWorkflows.filter(w => w.active);
  const inactiveWorkflows = filteredWorkflows.filter(w => !w.active);

  const listTitle = activeFilters.length > 0 ? `Triggerable Workflows${FILTER_APPLIED_INDICATOR}` : "Triggerable Workflows";

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
                         <Action.Push // Add filter action here too for consistency
                           title="Set Trigger Filters..."
                           icon={Icon.Filter}
                           target={<TriggerFilterForm />}
                           shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                         />
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
      searchBarPlaceholder={"Search triggerable webhook workflows"}
      navigationTitle={listTitle} // Show filter indicator in title
    >
      {filteredWorkflows.length === 0 && !loading ? (
         <EmptyView
            title={activeFilters.length > 0 ? "No Workflows Match Filters" : "No Webhook Workflows Found"}
            description={activeFilters.length > 0 ? "Try adjusting your tag filters." : "Ensure you have workflows with webhook trigger nodes."}
            extensionPreferences={false}
            actions={ // Add actions to EmptyView
                <ActionPanel>
                    <Action.Push
                        title="Set Trigger Filters..."
                        icon={Icon.Filter}
                        target={<TriggerFilterForm />}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                    <Action title="Refresh List" icon={Icon.Repeat} onAction={() => setRefresh(Date.now())} />
                    <ActionOpenPreferences />
                </ActionPanel>
            }
         />
      ) : (
        <>
          <List.Section title={"Active"} subtitle={`${activeWorkflows.length} workflow(s)`}>
            {activeWorkflows.map((workflow) => (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: Color.Green }}
                key={workflow.id}
                title={workflow.name}
                accessories={workflow.tags.map(tag => ({ tag: { value: tag.name, color: Color.Blue } }))} // Show tags
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionPanel>
                    {/* Main Actions */}
                    <ActionPanel.Section>
                      <ActionOnWorkflow
                        workflow={workflow}
                        setRefresh={() => setRefresh(Date.now())}
                        setRefreshDetail={setRefreshDetail}
                        showDetail={showDetail}
                      />
                      <Action.OpenInBrowser
                        title="Open Workflow in n8n"
                        url={getWorkflowUrl(instanceUrl, workflow.id)}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel.Section>

                    {/* Saved Commands & Filters */}
                    <ActionPanel.Section title="Commands & Filters">
                      <Action.Push
                        title="Save Webhook Command..."
                        icon={Icon.Download}
                        target={<SaveCommandForm workflow={workflow} />}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      />
                      <Action.Push
                        title="Set Trigger Filters..."
                        icon={Icon.Filter}
                        target={<TriggerFilterForm />}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      />
                    </ActionPanel.Section>

                    {/* Preferences */}
                    <ActionPanel.Section>
                      <ActionOpenPreferences />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title={"Inactive"} subtitle={`${inactiveWorkflows.length} workflow(s)`}>
            {inactiveWorkflows.map((workflow) => (
              <List.Item
                icon={{ source: "list-icon.svg" }}
                key={workflow.id}
                title={workflow.name}
                accessories={workflow.tags.map(tag => ({ tag: { value: tag.name, color: Color.SecondaryText } }))} // Show tags
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionPanel>
                    <ActionOnWorkflow // Use the same action component
                      workflow={workflow}
                      setRefresh={() => setRefresh(Date.now())}
                      setRefreshDetail={setRefreshDetail}
                      showDetail={showDetail}
                    />
                     <ActionPanel.Section title="Filters & Settings">
                       <Action.Push
                         title="Set Trigger Filters..."
                         icon={Icon.Filter}
                         target={<TriggerFilterForm />}
                         shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                       />
                       <ActionOpenPreferences />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}