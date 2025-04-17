import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast, getPreferenceValues } from "@raycast/api"; // Removed useNavigation
import { Dispatch, SetStateAction } from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Workflow } from "../types/types";
import { activateWorkflowAPI } from "../utils/n8n-api-utils";
import { SAVED_COMMANDS_KEY } from "../utils/constants";
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

  // Define actions as components/variables first for easier reordering
  const activateDeactivateAction = (
    <Action
      key="activate-deactivate"
      icon={workflow.active ? Icon.Circle : Icon.Checkmark}
      title={workflow.active ? "Deactivate Workflow" : "Activate Workflow"}
      onAction={async () => {
        const actionVerb = workflow.active ? "Deactivating" : "Activating";
        const actionPast = workflow.active ? "deactivated" : "activated";
        const toast = await showToast({ style: Toast.Style.Animated, title: `${actionVerb} workflow...` });
        try {
          await activateWorkflowAPI(String(workflow.id), !workflow.active);
          setRefresh(Date.now());
          toast.style = Toast.Style.Success;
          toast.title = `Workflow ${actionPast}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to ${actionVerb.toLowerCase()} workflow`;
          toast.message = error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );

  const triggerWebhookAction = webhookDetails ? (
    <Action.Push
      key="trigger-webhook"
      icon={Icon.Upload}
      title="Trigger Webhook..."
      target={
        <WebhookTriggerForm
          instanceUrl={instanceUrl}
          method={webhookDetails.method}
          path={webhookDetails.path}
          workflowName={workflow.name}
        />
      }
    />
  ) : null;

  const toggleDetailAction = (
    <Action
      key="toggle-detail"
      icon={Icon.Sidebar}
      title={"Toggle Detail"}
      shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
      onAction={async () => {
        await LocalStorage.setItem(LocalStorageKey.DETAIL_KEY, !showDetail);
        setRefreshDetail(Date.now());
      }}
    />
  );

  return (
    <ActionPanel>
      {/* Conditionally set default action */}
      {webhookDetails ? (
        <>
          {triggerWebhookAction}
          {toggleDetailAction}
          {activateDeactivateAction}
        </>
      ) : (
        <>
          {toggleDetailAction}
          {activateDeactivateAction}
        </>
      )}
      {/* Actions in sections appear below default actions */}
      <ActionPanel.Section>
         {/* Keep Open Preferences in its own section if desired, or move above */}
         <ActionOpenPreferences />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
