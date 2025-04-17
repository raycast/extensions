import { Action, ActionPanel, Color, Icon, LocalStorage, showHUD } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Workflow } from "../types/types";
import { executeWorkFlowsCLI, triggerWorkFlowsCLI } from "../utils/n8n-cli-utils";
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
        onAction={() => {
          showHUD(workflow.active ? "Workflow deactivated" : "Workflow activated").then();
          triggerWorkFlowsCLI(workflow.id, !workflow.active).then(async (r) => {
            setRefresh(Date.now());
            await showHUD(r);
          });
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
