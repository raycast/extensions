import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { useSavedWorkflows, useWorkflowActions } from "../hooks/useSavedWorkflows";
import { useUserInfo } from "../hooks/useUserInfo";
import { useWorkflowErrors } from "../hooks/useWorkflowErrors";
import { useMemo, useState, useEffect } from "react";
import { SavedWorkflow } from "../types";
import { groupWorkflowsByFolder, sortWorkflows, filterWorkflows } from "../utils/workflow";
import { WorkflowItem } from "./WorkflowItem";
import { PIPEDREAM_ERROR_HISTORY_URL } from "../utils/constants";
import { shouldAutoUnmarkAsFixed } from "../utils/error-resolution";
const collator = new Intl.Collator(undefined, { sensitivity: "base" });

type SortOption = "name" | "errors" | "triggers" | "steps";
type FilterOption = "all" | "menuBar" | "notMenuBar" | "errors";

interface WorkflowListProps {
  onWorkflowAction?: (_workflow: SavedWorkflow) => void;
  showEdit?: boolean;
  showViewErrors?: boolean;
  onViewErrorsHandler?: (_workflow: SavedWorkflow) => void;
  onEdit?: (workflow: SavedWorkflow) => void;
}

export function WorkflowList({
  onWorkflowAction,
  showEdit = true,
  showViewErrors = true,
  onViewErrorsHandler,
  onEdit,
}: WorkflowListProps) {
  const { workflows, isLoading, error, refreshWorkflows } = useSavedWorkflows();
  const { unmarkWorkflowAsFixed } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const prefs = getPreferenceValues();
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<SortOption>(prefs.DEFAULT_SORT ?? "name");
  const [filterBy, setFilterBy] = useState<FilterOption>(prefs.DEFAULT_FILTER ?? "all");

  const { errorInfo, refreshErrorInfo } = useWorkflowErrors(
    workflows,
    orgId ?? undefined,
    prefs.REFRESH_INTERVAL_SECONDS ? parseInt(prefs.REFRESH_INTERVAL_SECONDS) * 1000 : 0,
  );

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

  const handleViewErrors = (workflow: SavedWorkflow) => {
    if (onViewErrorsHandler) {
      onViewErrorsHandler(workflow);
    } else {
      open(`${PIPEDREAM_ERROR_HISTORY_URL}${workflow.id}`);
    }
  };

  useEffect(() => {
    if (!workflows || workflows.length === 0) return;

    const autoUnmarkWorkflows = async () => {
      const workflowsToUnmark: string[] = [];

      workflows.forEach((workflow) => {
        if (workflow.errorResolution) {
          const currentErrors = errorInfo[workflow.id]?.errors || [];
          if (shouldAutoUnmarkAsFixed(workflow, currentErrors)) {
            workflowsToUnmark.push(workflow.id);
          }
        }
      });

      if (workflowsToUnmark.length > 0) {
        await Promise.all(workflowsToUnmark.map((workflowId) => unmarkWorkflowAsFixed(workflowId)));

        if (workflowsToUnmark.length === 1) {
          const workflow = workflows.find((w) => w.id === workflowsToUnmark[0]);
          showToast({
            title: "Auto-unmarked",
            message: `${workflow?.customName || workflow?.id} has new errors`,
            style: Toast.Style.Animated,
          });
        } else {
          showToast({
            title: "Auto-unmarked",
            message: `${workflowsToUnmark.length} workflows have new errors`,
            style: Toast.Style.Animated,
          });
        }

        await refreshWorkflows();
      }
    };

    autoUnmarkWorkflows();
  }, [workflows, errorInfo, unmarkWorkflowAsFixed, refreshWorkflows]);

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
                onAction={() => launchCommand({ name: "connect-workflow", type: LaunchType.UserInitiated })}
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
        </ActionPanel>
      }
    >
      {sortedFolderNames.map((fld) => (
        <List.Section key={fld} title={fld}>
          {workflowsByFolder[fld]?.map((workflow) => (
            <WorkflowItem
              key={workflow.id}
              workflow={workflow}
              errorCount={errorCounts[workflow.id] ?? 0}
              currentErrors={errorInfo[workflow.id]?.errors || []}
              onEdit={showEdit && onEdit ? () => onEdit(workflow) : undefined}
              onViewErrors={showViewErrors ? () => handleViewErrors(workflow) : undefined}
              onCustomAction={onWorkflowAction ? () => onWorkflowAction(workflow) : undefined}
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
              currentErrors={errorInfo[workflow.id]?.errors || []}
              onEdit={showEdit && onEdit ? () => onEdit(workflow) : undefined}
              onViewErrors={showViewErrors ? () => handleViewErrors(workflow) : undefined}
              onCustomAction={onWorkflowAction ? () => onWorkflowAction(workflow) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
