import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast, getPreferenceValues } from "@raycast/api"; // Removed useNavigation
import { Dispatch, SetStateAction } from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Workflow } from "../types/types";
import { activateWorkflowAPI } from "../utils/n8n-api-utils";
import { LocalStorageKey } from "../utils/constants";
import { getWebhookDetails } from "../utils/workflow-utils"; // Import webhook helper
import WebhookTriggerForm from "./WebhookTriggerForm"; // Import the new form component (will create next)

// Define preferences needed here
interface Preferences {
  instanceUrl: string;
  // apiKey is not needed directly here, but good practice to define full expected prefs
  apiKey: string;
  rememberFilter: boolean;
}

export function ActionOnWorkflow(props: {
  workflow: Workflow;
  setRefresh: Dispatch<SetStateAction<number>>;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
}) {
  const { workflow, setRefresh, setRefreshDetail, showDetail } = props;
  const { instanceUrl } = getPreferenceValues<Preferences>();
  // Removed unused push variable: const { push } = useNavigation();

  const webhookDetails = getWebhookDetails(workflow);

  return (
    <ActionPanel>
      {/* Removed Execute Workflow action as API equivalent is not implemented */}
      <Action
        icon={workflow.active ? Icon.Circle : Icon.Checkmark}
        title={workflow.active ? "Deactivate Workflow" : "Activate Workflow"}
        onAction={async () => {
          const actionVerb = workflow.active ? "Deactivating" : "Activating";
          const actionPast = workflow.active ? "deactivated" : "activated";
          const toast = await showToast({ style: Toast.Style.Animated, title: `${actionVerb} workflow...` });
          try {
            // Convert ID to string as API expects string
            await activateWorkflowAPI(String(workflow.id), !workflow.active);
            setRefresh(Date.now()); // Refresh list on success
            toast.style = Toast.Style.Success;
            toast.title = `Workflow ${actionPast}`;
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `Failed to ${actionVerb.toLowerCase()} workflow`;
            toast.message = error instanceof Error ? error.message : String(error);
          }
        }}
      />
      {webhookDetails && (
          <Action.Push
            icon={Icon.Upload}
            title="Trigger Webhook..."
            target={
              <WebhookTriggerForm
                instanceUrl={instanceUrl}
                method={webhookDetails.method}
                path={webhookDetails.path}
                workflowName={workflow.name} // Pass name for context in the form
              />
            }
          />
      )}
      <ActionPanel.Section>
        <Action
          icon={Icon.Sidebar}
          title={"Toggle Detail"}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
          onAction={async () => {
            await LocalStorage.setItem(LocalStorageKey.DETAIL_KEY, !showDetail);
            setRefreshDetail(Date.now());
          }}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
