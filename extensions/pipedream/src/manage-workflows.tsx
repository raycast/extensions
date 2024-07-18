import {
  List,
  ActionPanel,
  Action,
  open,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  useNavigation,
  Form,
} from "@raycast/api";
import { useSavedWorkflows, useWorkflowActions } from "./hooks/useSavedWorkflows";
import { fetchWorkflowErrors, toggleWorkflowStatus } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { usePromise } from "@raycast/utils";
import { useMemo, useState, useCallback } from "react";
import { SavedWorkflow } from "./types";

type SortOption = "name" | "errors" | "triggers" | "steps";
type FilterOption = "all" | "menuBar" | "notMenuBar" | "errors";

const sortWorkflows = (
  workflows: SavedWorkflow[],
  sortBy: SortOption,
  sortOrder: "asc" | "desc",
  errorCounts: Record<string, number>,
) => {
  return [...workflows].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.customName.localeCompare(b.customName);
        break;
      case "errors":
        comparison = (errorCounts[b.id] ?? 0) - (errorCounts[a.id] ?? 0);
        break;
      case "triggers":
        comparison = b.triggerCount - a.triggerCount;
        break;
      case "steps":
        comparison = b.stepCount - a.stepCount;
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
};

const filterWorkflows = (workflows: SavedWorkflow[], filterBy: FilterOption, errorCounts: Record<string, number>) => {
  switch (filterBy) {
    case "menuBar":
      return workflows.filter((w) => w.showInMenuBar);
    case "notMenuBar":
      return workflows.filter((w) => !w.showInMenuBar);
    case "errors":
      return workflows.filter((w) => (errorCounts[w.id] ?? 0) > 0);
    default:
      return workflows;
  }
};

export default function ManageWorkflows() {
  const { workflows, isLoading, error, refreshWorkflows } = useSavedWorkflows();
  const { updateWorkflow, removeWorkflow, toggleMenuBarVisibility } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const { push } = useNavigation();

  const fetchErrorCounts = useCallback(async () => {
    if (!orgId || !workflows.length) return {};

    const counts: Record<string, number> = {};
    for (const workflow of workflows) {
      try {
        const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
        const recentErrors = errorResponse.data.filter(
          (error) => Date.now() - error.indexed_at_ms < 7 * 24 * 60 * 60 * 1000, // 7 days
        );
        counts[workflow.id] = recentErrors.length;
      } catch (error) {
        console.error(`Error fetching errors for workflow ${workflow.id}:`, error);
        counts[workflow.id] = 0;
      }
    }
    return counts;
  }, [orgId, workflows]);

  const { data: errorCounts = {}, revalidate: refreshErrorCounts } = usePromise(fetchErrorCounts);

  const filteredAndSortedWorkflows = useMemo(() => {
    if (!workflows) return [];

    let result = filterWorkflows(workflows, filterBy, errorCounts);
    result = sortWorkflows(result, sortBy, sortOrder, errorCounts);

    return result;
  }, [workflows, sortBy, sortOrder, filterBy, errorCounts]);

  const handleToggleWorkflowStatus = async (workflowId: string, newStatus: boolean) => {
    if (!orgId) {
      showToast({ title: "Error", message: "Organization ID not found", style: Toast.Style.Failure });
      return;
    }

    const options: Alert.Options = {
      title: newStatus ? "Activate Workflow" : "Deactivate Workflow",
      message: `Are you sure you want to ${newStatus ? "activate" : "deactivate"} this workflow? This will affect the workflow in Pipedream.`,
      primaryAction: {
        title: newStatus ? "Activate" : "Deactivate",
        style: newStatus ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await toggleWorkflowStatus(workflowId, orgId, newStatus);
        showToast({
          title: "Success",
          message: `Workflow ${newStatus ? "activated" : "deactivated"}`,
          style: Toast.Style.Success,
        });
        await refreshWorkflows();
        await refreshErrorCounts();
      } catch (error) {
        console.error("Error toggling workflow status:", error);
        showToast({
          title: "Error",
          message: `Failed to update workflow status: ${error instanceof Error ? error.message : String(error)}`,
          style: Toast.Style.Failure,
        });
      }
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    const options: Alert.Options = {
      title: "Remove Workflow from Extension",
      message:
        "Are you sure you want to remove this workflow from the extension? This will not delete the workflow from Pipedream, only from this list.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      await removeWorkflow(workflowId);
      showToast({
        title: "Success",
        message: "Workflow removed from extension list",
        style: Toast.Style.Success,
      });
      await refreshErrorCounts();
    }
  };

  const handleEditName = (workflowId: string, currentName: string) => {
    push(
      <EditWorkflowName
        currentName={currentName}
        onSave={async (newName: string) => {
          try {
            await updateWorkflow({ ...workflows.find((w) => w.id === workflowId)!, customName: newName });
            showToast({ title: "Success", message: "Workflow name updated", style: Toast.Style.Success });
            await refreshWorkflows();
            await refreshErrorCounts();
          } catch (error) {
            console.error("Error updating workflow name:", error);
            showToast({
              title: "Error",
              message: `Failed to update workflow name: ${error instanceof Error ? error.message : String(error)}`,
              style: Toast.Style.Failure,
            });
          }
        }}
      />,
    );
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error instanceof Error ? error.message : String(error)} />
      </List>
    );
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort and Filter"
          storeValue={true}
          onChange={(newValue) => {
            const [action, value] = newValue.split("-");
            if (action === "sort") {
              setSortBy(value as SortOption);
            } else if (action === "filter") {
              setFilterBy(value as FilterOption);
            }
          }}
        >
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Name" value="sort-name" />
            <List.Dropdown.Item title="Errors" value="sort-errors" />
            <List.Dropdown.Item title="Triggers" value="sort-triggers" />
            <List.Dropdown.Item title="Steps" value="sort-steps" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Filter">
            <List.Dropdown.Item title="All Workflows" value="filter-all" />
            <List.Dropdown.Item title="Menu Bar Workflows" value="filter-menuBar" />
            <List.Dropdown.Item title="Not in Menu Bar" value="filter-notMenuBar" />
            <List.Dropdown.Item title="Workflows with Errors" value="filter-errors" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredAndSortedWorkflows.map((workflow) => (
        <List.Item
          key={workflow.id}
          title={workflow.customName}
          subtitle={`ID: ${workflow.id}`}
          accessories={[
            { text: `Triggers: ${workflow.triggerCount}` },
            { text: `Steps: ${workflow.stepCount}` },
            { text: `Errors (7d): ${errorCounts[workflow.id] ?? 0}` },
            { icon: workflow.showInMenuBar ? Icon.Eye : Icon.EyeSlash },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Workflow Actions">
                <Action.OpenInBrowser url={workflow.url} icon={Icon.Globe} />
                <Action
                  title="Edit Name"
                  icon={Icon.Pencil}
                  onAction={() => handleEditName(workflow.id, workflow.customName)}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.CopyToClipboard
                  title="Copy Workflow ID"
                  content={workflow.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.Clipboard}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Status Actions">
                <Action
                  title="View Errors"
                  icon={Icon.ExclamationMark}
                  onAction={() => open(`https://pipedream.com/@/event-history?status=error&id=${workflow.id}`)}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
                <Action
                  title="Activate Workflow"
                  icon={Icon.Play}
                  onAction={() => handleToggleWorkflowStatus(workflow.id, true)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action
                  title="Deactivate Workflow"
                  icon={Icon.Stop}
                  onAction={() => handleToggleWorkflowStatus(workflow.id, false)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Visibility Actions">
                <Action
                  title={workflow.showInMenuBar ? "Remove from Menu Bar" : "Add to Menu Bar"}
                  icon={workflow.showInMenuBar ? Icon.EyeSlash : Icon.Eye}
                  onAction={() => toggleMenuBarVisibility(workflow.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Remove from Extension"
                  icon={Icon.Trash}
                  onAction={() => handleDeleteWorkflow(workflow.id)}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EditWorkflowName({
  currentName,
  onSave,
}: {
  currentName: string;
  onSave: (newName: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    await onSave(values.name);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Workflow Name" defaultValue={currentName} />
    </Form>
  );
}
