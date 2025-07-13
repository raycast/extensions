import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
  Form,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useSavedWorkflows, useWorkflowActions } from "../hooks/useSavedWorkflows";
import { useUserInfo } from "../hooks/useUserInfo";
import { useWorkflowErrors } from "../hooks/useWorkflowErrors";
import { useMemo, useState } from "react";
import { SavedWorkflow, Preferences } from "../types";
import { groupWorkflowsByFolder, getExistingFolders } from "../utils/workflow";
import { WorkflowItem } from "./WorkflowItem";
import { useOptimisticToggle } from "../hooks/useOptimisticToggle";
const collator = new Intl.Collator(undefined, { sensitivity: "base" });

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
        comparison = collator.compare(a.customName ?? "", b.customName ?? "");
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

interface WorkflowListProps {
  onWorkflowAction?: (workflow: SavedWorkflow) => void;
  actionTitle?: string;
  actionIcon?: Icon;
  showEdit?: boolean;
  showDelete?: boolean;
  showMenuBarToggle?: boolean;
  showViewErrors?: boolean;
  showViewDetails?: boolean;
  onViewDetailsHandler?: (workflow: SavedWorkflow) => void;
}

export function WorkflowList({
  onWorkflowAction,
  actionTitle,
  actionIcon,
  showEdit = true,
  showDelete = true,
  showMenuBarToggle = true,
  showViewErrors = true,
  showViewDetails = false,
  onViewDetailsHandler,
}: WorkflowListProps) {
  const { workflows, isLoading, error, refreshWorkflows } = useSavedWorkflows();
  const { updateWorkflow, removeWorkflow, toggleMenuBarVisibility } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const prefs = getPreferenceValues<Preferences>();
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<SortOption>(prefs.DEFAULT_SORT ?? "name");
  const [filterBy, setFilterBy] = useState<FilterOption>(prefs.DEFAULT_FILTER ?? "all");
  const { push } = useNavigation();

  const { errorInfo, refreshErrorInfo } = useWorkflowErrors(
    workflows,
    orgId ?? undefined,
    prefs.REFRESH_INTERVAL_SECONDS ? parseInt(prefs.REFRESH_INTERVAL_SECONDS) * 1000 : 0,
  );

  const toggleActive = useOptimisticToggle(
    workflows,
    updateWorkflow,
    async () => {
      await refreshWorkflows();
      await refreshErrorInfo();
    },
    orgId || undefined,
  );

  const handleActivate = async (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;
    const options: Alert.Options = {
      title: "Activate Workflow",
      message: `Are you sure you want to activate '${workflow.customName || workflow.id}'?`,
      primaryAction: { title: "Activate", style: Alert.ActionStyle.Default },
    };
    if (await confirmAlert(options)) {
      await toggleActive(workflowId, true);
      showToast({ title: "Activated", message: "Workflow activated", style: Toast.Style.Success });
      await refreshErrorInfo();
    }
  };

  const handleDeactivate = async (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;
    const options: Alert.Options = {
      title: "Deactivate Workflow",
      message: `Are you sure you want to deactivate '${workflow.customName || workflow.id}'?`,
      primaryAction: { title: "Deactivate", style: Alert.ActionStyle.Destructive },
    };
    if (await confirmAlert(options)) {
      await toggleActive(workflowId, false);
      showToast({ title: "Deactivated", message: "Workflow deactivated", style: Toast.Style.Success });
      await refreshErrorInfo();
    }
  };

  const errorCounts: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(errorInfo).forEach(([id, info]) => {
      map[id] = info?.count ?? 0;
    });
    return map;
  }, [errorInfo]);

  const filteredAndSortedWorkflows = useMemo(() => {
    if (!workflows) return [];

    let result = filterWorkflows(workflows, filterBy, errorCounts);
    result = sortWorkflows(result, sortBy, sortOrder, errorCounts);

    return result;
  }, [workflows, sortBy, sortOrder, filterBy, errorCounts]);

  const workflowsByFolder = useMemo(
    () => groupWorkflowsByFolder(filteredAndSortedWorkflows),
    [filteredAndSortedWorkflows],
  );

  const sortedFolderNames = useMemo(() => {
    return Object.keys(workflowsByFolder)
      .filter((f) => f !== "")
      .sort((a, b) => collator.compare(a ?? "", b ?? ""));
  }, [workflowsByFolder]);

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
      await refreshErrorInfo();
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
            await refreshErrorInfo();
          } catch (error) {
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

  const handleEditFolder = (workflowId: string, currentFolder: string) => {
    push(
      <EditWorkflowFolder
        currentFolder={currentFolder}
        onSave={async (newFolder: string) => {
          try {
            await updateWorkflow({ ...workflows.find((w) => w.id === workflowId)!, folder: newFolder });
            showToast({ title: "Success", message: "Workflow folder updated", style: Toast.Style.Success });
            await refreshWorkflows();
            await refreshErrorInfo();
          } catch (error) {
            showToast({
              title: "Error",
              message: `Failed to update workflow folder: ${error instanceof Error ? error.message : String(error)}`,
              style: Toast.Style.Failure,
            });
          }
        }}
      />,
    );
  };

  const handleViewDetails = (workflow: SavedWorkflow) => {
    if (onViewDetailsHandler) {
      onViewDetailsHandler(workflow);
    } else if (onWorkflowAction) {
      onWorkflowAction(workflow);
    }
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

  if (!isLoading && (!workflows || workflows.length === 0)) {
    return (
      <List>
        <List.EmptyView
          title="No workflows found"
          description="Add a workflow from the Connect Workflow page."
          actions={
            <ActionPanel>
              <Action
                title="Open Connect Workflow"
                icon={Icon.Plus}
                onAction={() => open("raycast://extensions/olekristianbe/pipedream/connect-workflow")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort and Filter Options"
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
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await refreshWorkflows();
              await refreshErrorInfo();
            }}
          />
          <Action
            title="Edit Workflow Folder"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => {
              // This will be handled by individual workflow items
              // The action is available in the command palette for quick access
            }}
          />
        </ActionPanel>
      }
    >
      {sortedFolderNames.map((fld) => (
        <List.Section key={fld} title={fld}>
          {workflowsByFolder[fld].map((workflow) => (
            <WorkflowItem
              key={workflow.id}
              workflow={workflow}
              errorCount={errorCounts[workflow.id] ?? 0}
              onEditName={showEdit ? () => handleEditName(workflow.id, workflow.customName) : undefined}
              onEditFolder={showEdit ? () => handleEditFolder(workflow.id, workflow.folder ?? "") : undefined}
              onToggleMenuBar={showMenuBarToggle ? () => toggleMenuBarVisibility(workflow.id) : undefined}
              onViewErrors={
                showViewErrors
                  ? () => open(`https://pipedream.com/@/event-history?status=error&id=${workflow.id}`)
                  : undefined
              }
              onViewDetails={showViewDetails ? () => handleViewDetails(workflow) : undefined}
              onDelete={showDelete ? () => handleDeleteWorkflow(workflow.id) : undefined}
              onCustomAction={onWorkflowAction ? () => onWorkflowAction(workflow) : undefined}
              customActionTitle={actionTitle}
              customActionIcon={actionIcon}
              onActivate={() => handleActivate(workflow.id)}
              onDeactivate={() => handleDeactivate(workflow.id)}
            />
          ))}
        </List.Section>
      ))}
      {workflowsByFolder[""] && (
        <List.Section key="no-folder" title="No Folder">
          {workflowsByFolder[""]?.map((workflow) => (
            <WorkflowItem
              key={workflow.id}
              workflow={workflow}
              errorCount={errorCounts[workflow.id] ?? 0}
              onEditName={showEdit ? () => handleEditName(workflow.id, workflow.customName) : undefined}
              onEditFolder={showEdit ? () => handleEditFolder(workflow.id, workflow.folder ?? "") : undefined}
              onToggleMenuBar={showMenuBarToggle ? () => toggleMenuBarVisibility(workflow.id) : undefined}
              onViewErrors={
                showViewErrors
                  ? () => open(`https://pipedream.com/@/event-history?status=error&id=${workflow.id}`)
                  : undefined
              }
              onViewDetails={showViewDetails ? () => handleViewDetails(workflow) : undefined}
              onDelete={showDelete ? () => handleDeleteWorkflow(workflow.id) : undefined}
              onCustomAction={onWorkflowAction ? () => onWorkflowAction(workflow) : undefined}
              customActionTitle={actionTitle}
              customActionIcon={actionIcon}
              onActivate={() => handleActivate(workflow.id)}
              onDeactivate={() => handleDeactivate(workflow.id)}
            />
          ))}
        </List.Section>
      )}
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

function EditWorkflowFolder({
  currentFolder,
  onSave,
}: {
  currentFolder: string;
  onSave: (newFolder: string) => Promise<void>;
}) {
  const { workflows } = useSavedWorkflows();
  const existingFolders = getExistingFolders(workflows);
  const { pop } = useNavigation();
  const [folderChoice, setFolderChoice] = useState<string>(
    currentFolder && existingFolders.includes(currentFolder) ? currentFolder : currentFolder ? "__custom__" : "",
  );
  const [customFolder, setCustomFolder] = useState(folderChoice === "__custom__" ? currentFolder : "");

  const handleSubmit = async () => {
    const finalFolder = folderChoice === "__custom__" ? customFolder : folderChoice;
    await onSave(finalFolder);
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
      <Form.Dropdown id="folder" title="Folder" value={folderChoice} onChange={setFolderChoice}>
        <Form.Dropdown.Item value="" title="None" />
        {existingFolders.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Add Folder..." />
      </Form.Dropdown>
      {folderChoice === "__custom__" && (
        <Form.TextField id="customFolder" title="New Folder" value={customFolder} onChange={setCustomFolder} />
      )}
    </Form>
  );
}
