import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { MutatePromise, useCachedState, useFetch } from "@raycast/utils";
import { EmptyView } from "./components/empty-view";
import { Workflow } from "./types/types";
import { useState } from "react";
import { filterTag } from "./utils/constants";
import { DetailView } from "./components/detail-view";
import fetch from "node-fetch";
import { ActionOpenPreferences } from "./components/action-open-preferences";

const { instanceUrl, apiKey, rememberFilter } = getPreferenceValues<Preferences.SearchWorkflowsApi>();
const API_URL = new URL("api/v1/", instanceUrl);
const API_HEADERS = {
  Accept: "application/json",
  "X-N8N-API-KEY": apiKey,
};

export default function SearchWorkflows() {
  const [filter, setFilter] = useState("");
  const [isShowingDetail] = useCachedState("show-workflow-details", false);

  const {
    isLoading,
    data: workflows,
    mutate,
  } = useFetch(API_URL + "workflows", {
    method: "GET",
    headers: API_HEADERS,
    mapResult(result: { data: Workflow[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && workflows.length > 0}
      searchBarPlaceholder="Search workflows"
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"} storeValue={rememberFilter}>
          {filterTag.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <EmptyView title={"No Workflow"} extensionPreferences={true} />
      <List.Section title={"Active"}>
        {workflows.map((value, index) => {
          return (
            value.active &&
            (filter === filterTag[0].value || filter.toString() === filterTag[1].value) && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.active ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<DetailView workflow={value} />}
                actions={<WorkflowActions workflow={value} mutate={mutate} />}
              />
            )
          );
        })}
      </List.Section>
      <List.Section title={"Not Active"}>
        {workflows.map((value, index) => {
          return (
            !value.active &&
            (filter === filterTag[0].value || filter.toString() === filterTag[2].value) && (
              <List.Item
                icon={{ source: "list-icon.svg", tintColor: value.active ? Color.Green : undefined }}
                key={index}
                title={value.name}
                detail={<DetailView workflow={value} />}
                actions={<WorkflowActions workflow={value} mutate={mutate} />}
              />
            )
          );
        })}
      </List.Section>
    </List>
  );
}

function WorkflowActions({ workflow, mutate }: { workflow: Workflow; mutate: MutatePromise<Workflow[]> }) {
  const [, setIsShowingDetail] = useCachedState<boolean>("show-workflow-details");

  async function toggleWorkflow() {
    const deactivating = workflow.active;
    const toast = await showToast(
      Toast.Style.Animated,
      deactivating ? "Deactivating workflow" : "Activating workflow",
      workflow.name
    );
    try {
      await mutate(
        fetch(API_URL + `workflows/${workflow.id}/${deactivating ? "deactivate" : "activate"}`, {
          method: "POST",
          headers: API_HEADERS,
        }),
        {
          optimisticUpdate(data) {
            const index = data.findIndex((w) => w.id === workflow.id);
            data[index] = { ...workflow, active: !workflow.active };
            return data;
          },
        }
      );
      toast.style = Toast.Style.Success;
      toast.title = deactivating ? "Workflow deactivated" : "Workflow activated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = deactivating ? "Deactivating failed" : "Activating failed";
    }
  }
  return (
    <ActionPanel>
      <Action
        icon={workflow.active ? Icon.Circle : Icon.Checkmark}
        title={workflow.active ? "Deactivate Workflow" : "Activate Workflow"}
        onAction={toggleWorkflow}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.Sidebar}
          title={"Toggle Detail"}
          shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
          onAction={() => setIsShowingDetail((show) => !show)}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
