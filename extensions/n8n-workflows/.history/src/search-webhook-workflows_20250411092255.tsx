import { Color, getPreferenceValues, List, showToast, Toast, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionOnWorkflow } from "./components/action-on-workflow"; // Re-use the same actions
import { EmptyView } from "./components/empty-view";
import { DetailView } from "./components/detail-view";
import { getAllWorkflowsAPI } from "./utils/n8n-api-utils";
import { Workflow } from "./types/types";
import { getIsShowDetail } from "./hooks/hooks";
import { getWebhookDetails } from "./utils/workflow-utils"; // Import the helper
import { ActionOpenPreferences } from "./components/action-open-preferences"; // For error view

// Define the preferences interface matching package.json
interface Preferences {
  instanceUrl: string;
  apiKey: string;
  // No rememberFilter needed for this command
}

export default function SearchWebhookWorkflowsCommand() {
  const { instanceUrl, apiKey } = getPreferenceValues<Preferences>();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      try {
        const fetchedWorkflows = await getAllWorkflowsAPI();
        // Filter for workflows with webhook triggers *after* fetching
        const webhookWorkflows = fetchedWorkflows.filter(wf => getWebhookDetails(wf) !== null);
        setWorkflows(webhookWorkflows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch workflows");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [refresh, instanceUrl, apiKey]);

  // Separate active and inactive after filtering
  const activeWorkflows = workflows.filter(w => w.active);
  const inactiveWorkflows = workflows.filter(w => !w.active);

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
      isShowingDetail={showDetail && workflows.length > 0}
      searchBarPlaceholder={"Search triggerable webhook workflows"}
      // No dropdown filter needed here
    >
      {workflows.length === 0 && !loading ? (
         <EmptyView title={"No Webhook Workflows Found"} extensionPreferences={false} />
      ) : (
        <>
          <List.Section title={"Active"} subtitle={`${activeWorkflows.length} workflow(s)`}>
            {activeWorkflows.map((workflow) => (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: Color.Green }}
                key={workflow.id}
                title={workflow.name}
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionOnWorkflow // Use the same action component
                    workflow={workflow}
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
                icon={{ source: "list-icon.svg" }}
                key={workflow.id}
                title={workflow.name}
                detail={<DetailView workflow={workflow} />}
                actions={
                  <ActionOnWorkflow // Use the same action component
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