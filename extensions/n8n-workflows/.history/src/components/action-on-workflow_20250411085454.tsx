import { Action, ActionPanel, Color, Icon, LocalStorage, showToast, Toast } from "@raycast/api"; // Added showToast, Toast, removed showHUD
import { Dispatch, SetStateAction } from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Workflow } from "../types/types";
import { executeWorkFlowsCLI } from "../utils/n8n-cli-utils"; // Removed triggerWorkFlowsCLI
import { activateWorkflowAPI } from "../utils/n8n-api-utils"; // Added activateWorkflowAPI
import { LocalStorageKey } from "../utils/constants";

export function ActionOnWorkflow(props: {
  workflow: Workflow;
  setRefresh: Dispatch<SetStateAction<number>>;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
}) {
  const { workflow, setRefresh, setRefreshDetail, showDetail } = props;
  return (
    <ActionPanel>
      <Action
        icon={{ source: "list-icon.svg", tintColor: Color.PrimaryText }}
        title={"Execute Workflow"}
        onAction={() => {
          showHUD("Workflow executed").then();
          executeWorkFlowsCLI(workflow.id).then(async (r) => {
            await showHUD(r);
          });
        }}
      />
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
