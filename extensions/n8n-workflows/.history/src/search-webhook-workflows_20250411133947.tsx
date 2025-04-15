import { Color, getPreferenceValues, List, showToast, Toast, Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionOnWorkflow } from "./components/action-on-workflow"; // Re-use the same actions
import { EmptyView } from "./components/empty-view";
import { DetailView } from "./components/detail-view";
import { getAllWorkflowsAPI, triggerWebhook } from "./utils/n8n-api-utils"; // Import triggerWebhook
import { Workflow } from "./types/types";
import { getIsShowDetail } from "./hooks/hooks";
import { getWebhookDetails } from "./utils/workflow-utils"; // Removed getWebhookUrl import
import SaveCommandForm from "./components/SaveCommandForm";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import TriggerFilterForm from "./components/TriggerFilterForm";
import ResetStorageForm from "./components/ResetStorageForm";
import { resetAllStorageData } from "./utils/reset-utils";
import { TRIGGER_FILTERS_KEY, FILTER_APPLIED_INDICATOR } from "./utils/constants";

// Define the preferences interface matching package.json
interface Preferences {
  instanceUrl: string;
  apiKey: string;
}

// Helper to get workflow URL (moved outside component)
function getWorkflowUrl(instanceUrl: string, workflowId: number): string {
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  return `${baseUrl}/workflow/${workflowId}`;
}

// Helper to get webhook URL (moved outside component)
function getWebhookUrl(instanceUrl: string, path: string): string {
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  const webhookPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/webhook${webhookPath}`; // Assumes production URL structure
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
    // Add logging when the component is rendered
    console.log("Rendering SearchWebhookWorkflowsCommand");
  }, []);

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
      // 1. Load saved filters with validation
      const storedFilters = await LocalStorage.getItem<string>(TRIGGER_FILTERS_KEY);
      let currentFilters: string[] = [];
      
      if (storedFilters) {
        try {
          const parsedFilters = JSON.parse(storedFilters);
          
          // Validate filters are in the expected format
          if (Array.isArray(parsedFilters)) {
            // Filter out non-string values
            currentFilters = parsedFilters.filter(item => typeof item === 'string');
            
            // If we found invalid items, save the cleaned version back
            if (currentFilters.length !== parsedFilters.length) {
              console.warn(`Found ${parsedFilters.length - currentFilters.length} invalid filter items, cleaning up`);
              await LocalStorage.setItem(TRIGGER_FILTERS_KEY, JSON.stringify(currentFilters));
            }
          } else {
            console.warn("Saved filters are not in array format, resetting");
            await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
          }
        } catch (parseError) {
          console.error("Failed to parse saved filters:", parseError);
          await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
        }
      }
      
      setActiveFilters(currentFilters); // Update state for UI indicator

      // 2. Fetch all workflows
      const fetchedWorkflows = await getAllWorkflowsAPI();

      // 3. First filter for webhook triggers
      const webhookWorkflows = fetchedWorkflows.filter(wf => getWebhookDetails(wf) !== null);

      // 4. Then apply tag filters if any
      if (currentFilters.length > 0) {
        const workflowsMatchingFilters = webhookWorkflows.filter(wf =>
          wf.tags?.some(tag => currentFilters.includes(tag.name)) ?? false
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
            {/* Use the updated EmptyView structure for errors */}
            <EmptyView
                title="Failed to Load Workflows"
                extensionPreferences={false} // Don't show default pref action
                actions={
                    <ActionPanel title="Error Actions">
                        <ActionPanel.Section title="Troubleshooting">
                            <Action
                                title="Retry"
                                icon={Icon.Repeat}
                                onAction={() => setRefresh(Date.now())}
                            />
                            <Action
                                title="Reset All Data"
                                icon={Icon.Trash}
                                style={Action.Style.Destructive}
                                onAction={async () => {
                                    try {
                                        await resetAllStorageData();
                                        setRefresh(Date.now()); // Refresh after reset
                                    } catch (error) {
                                        console.error("Failed to reset storage:", error);
                                    }
                                }}
                            />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Settings">
                            <ActionOpenPreferences />
                            <Action.Push
                                title="Set Trigger Filters..."
                                icon={Icon.Filter}
                                target={<TriggerFilterForm />}
                                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                            />
                        </ActionPanel.Section>
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
      searchBarAccessory={
        <List.Dropdown
          tooltip="Actions"
          storeValue={false}
          onChange={(value) => {
            if (value === "reset") {
              (async () => {
                try {
                  await resetAllStorageData();
                  setRefresh(Date.now()); // Refresh after reset
                } catch (error) {
                  console.error("Failed to reset storage:", error);
                }
              })();
            }
          }}
        >
          <List.Dropdown.Item title="Select Action..." value="" />
          <List.Dropdown.Item title="Reset All Storage Data" value="reset" icon={Icon.Trash} />
        </List.Dropdown>
      }
    >
      {filteredWorkflows.length === 0 && !loading ? (
         <EmptyView
            title={activeFilters.length > 0 ? "No Workflows Match Filters" : "No Webhook Workflows Found"}
            extensionPreferences={false} // Don't show default pref action
            actions={
                <ActionPanel title="Webhook Actions">
                    <ActionPanel.Section title="Filter Actions">
                        <Action.Push
                            title="Set Trigger Filters..."
                            icon={Icon.Filter}
                            target={<TriggerFilterForm />}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        />
                        <Action
                            title="Refresh List"
                            icon={Icon.Repeat}
                            onAction={() => setRefresh(Date.now())}
                        />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Settings">
                        <ActionOpenPreferences />
                        <Action.Push
                            title="Reset Storage Data..."
                            icon={Icon.Trash}
                            target={<ResetStorageForm />}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                        />
                        <Action
                            title="Reset All Data Now"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={async () => {
                                try {
                                    await resetAllStorageData();
                                    setRefresh(Date.now()); // Refresh after reset
                                } catch (error) {
                                    console.error("Failed to reset storage:", error);
                                }
                            }}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
         />
      ) : (
        <>
          <List.Section title={"Active"} subtitle={`${activeWorkflows.length} workflow(s)`}>
            {activeWorkflows.map((workflow) => {
              // DEBUG: Check if workflow name is missing
              if (!workflow.name) {
                console.error(`Workflow ID ${workflow.id} is missing a name!`, workflow);
              }
              const webhookDetails = getWebhookDetails(workflow);
              const webhookFullUrl = webhookDetails ? getWebhookUrl(instanceUrl, webhookDetails.path) : null;

              return (
                <List.Item
                  icon={{ source: "list-icon.svg", tintColor: Color.Green }}
                  key={workflow.id}
                  title={workflow.name ?? "Unnamed Workflow"}
                  accessories={workflow.tags.map(tag => ({ tag: { value: tag.name, color: Color.Blue } }))} // Show tags
                  detail={<DetailView workflow={workflow} />}
                  actions={
                    <ActionPanel>
                      {/* Main Actions */}
                      <ActionPanel.Section>
                        {webhookDetails && webhookFullUrl && (
                          <Action
                            title="Trigger Webhook"
                            icon={Icon.Play}
                            onAction={async () => {
                              const toast = await showToast({ style: Toast.Style.Animated, title: "Triggering webhook..." });
                              try {
                                const result = await triggerWebhook(webhookFullUrl, webhookDetails.method);
                                if (result.ok) {
                                  toast.style = Toast.Style.Success;
                                  toast.title = "Webhook Triggered Successfully";
                                  toast.message = `Status: ${result.status}`;
                                } else {
                                  toast.style = Toast.Style.Failure;
                                  toast.title = "Webhook Trigger Failed";
                                  toast.message = `Status: ${result.status}, Body: ${result.body.substring(0, 100)}`; // Show snippet of body
                                }
                              } catch (err) {
                                toast.style = Toast.Style.Failure;
                                toast.title = "Webhook Request Error";
                                toast.message = err instanceof Error ? err.message : String(err);
                              }
                            }}
                          />
                        )}
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
                        {webhookDetails && webhookFullUrl && (
                          <Action.Push
                            title="Save Webhook Command..."
                            icon={Icon.Download}
                            // Pass correct props to SaveCommandForm
                            target={
                              <SaveCommandForm
                                method={webhookDetails.method}
                                url={webhookFullUrl}
                                // Pass empty strings for optional fields
                                headers=""
                                queryParams=""
                                body=""
                              />
                            }
                            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          />
                        )}
                        <Action.Push
                          title="Set Trigger Filters..."
                          icon={Icon.Filter}
                          target={<TriggerFilterForm />}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                        />
                      </ActionPanel.Section>

                      {/* Preferences & Troubleshooting */}
                      <ActionPanel.Section title="Preferences & Troubleshooting">
                        <ActionOpenPreferences />
                        <Action.Push
                          title="Reset Storage Data..."
                          icon={Icon.Trash}
                          target={<ResetStorageForm />}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          <List.Section title={"Inactive"} subtitle={`${inactiveWorkflows.length} workflow(s)`}>
            {inactiveWorkflows.map((workflow) => {
              // DEBUG: Check if workflow name is missing
              if (!workflow.name) {
                console.error(`Inactive Workflow ID ${workflow.id} is missing a name!`, workflow);
              }
              return ( // Add return statement here
              <List.Item
                icon={{ source: "list-icon.svg" }}
                key={workflow.id}
                title={workflow.name ?? "Unnamed Workflow"}
                accessories={workflow.tags.map(tag => ({ tag: { value: tag.name, color: Color.SecondaryText } }))} // Show tags
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionPanel>
                    {/* Main Actions for Inactive */}
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
                     {/* Filters & Settings for Inactive */}
                     <ActionPanel.Section title="Filters & Settings">
                       <Action.Push
                         title="Set Trigger Filters..."
                         icon={Icon.Filter}
                         target={<TriggerFilterForm />}
                         shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                       />
                       <ActionOpenPreferences />
                       <Action.Push
                         title="Reset Storage Data..."
                         icon={Icon.Trash}
                         target={<ResetStorageForm />}
                         shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                       />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ); // Close the return statement parenthesis
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
