import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import path from "node:path";
import { useEffect, useState } from "react";
import { Repo } from "../lib/git";
import { WorkflowFile, listDispatchableWorkflows } from "../lib/workflows";
import { useRunWorkflow } from "../hooks/useRunWorkflow";
import { usePinnedWorkflows } from "../hooks/usePinnedWorkflows";
import WorkflowFileActionPanelSection from "../components/WorkflowFileActionPanelSection";

interface WorkflowsListViewProps {
  repo: Repo;
}

export default function WorkflowsListView({ repo }: WorkflowsListViewProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);

  const { data: workflows, isLoading: isLoadingWorkflows } = useCachedPromise(
    async (repoPath: string) => listDispatchableWorkflows(repoPath),
    [repo.path],
  );

  const {
    ownerRepo,
    branches,
    currentBranch,
    isLoading: isLoadingBranches,
    getRunWorkflowTarget,
  } = useRunWorkflow(repo);

  const { pinnedPaths, isPinned, togglePin, moveUp, moveDown, pruneToExisting } = usePinnedWorkflows();

  useEffect(() => {
    // Prune once loading has settled — including when the resolved list is empty — so stale
    // pinned paths for a repo whose workflows were all removed/renamed don't linger forever.
    // Scoped to this repo's own path so other repos' pinned workflows are left untouched.
    if (workflows) pruneToExisting(new Set(workflows.map((w) => w.path)), repo.path + path.sep);
  }, [workflows, pruneToExisting, repo.path]);

  const isLoading = isLoadingWorkflows || isLoadingBranches;

  const branch = selectedBranch ?? currentBranch ?? branches[0];

  const allWorkflows = workflows ?? [];
  const pinnedSet = new Set(pinnedPaths);
  const pinnedWorkflows = pinnedPaths
    .map((p) => allWorkflows.find((w) => w.path === p))
    .filter((w): w is WorkflowFile => Boolean(w));
  const unpinnedWorkflows = allWorkflows.filter((w) => !pinnedSet.has(w.path));

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Branch" value={branch ?? ""} onChange={setSelectedBranch} storeValue={false}>
          {currentBranch && (
            <List.Dropdown.Section title="Current Branch">
              <List.Dropdown.Item title={currentBranch} value={currentBranch} />
            </List.Dropdown.Section>
          )}
          <List.Dropdown.Section>
            {branches
              .filter((b) => b !== currentBranch)
              .map((b) => (
                <List.Dropdown.Item key={b} title={b} value={b} />
              ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && allWorkflows.length === 0 ? (
        <List.EmptyView
          title="No Dispatchable Workflows Found"
          description={`No workflows in ${repo.name} declare a workflow_dispatch trigger.`}
        />
      ) : (
        <>
          {pinnedWorkflows.length > 0 && (
            <List.Section title="Pinned">
              {pinnedWorkflows.map((workflow) => (
                <WorkflowListItem
                  key={workflow.path}
                  repo={repo}
                  workflow={workflow}
                  branch={branch}
                  ownerRepo={ownerRepo}
                  getRunWorkflowTarget={getRunWorkflowTarget}
                  pinned={isPinned(workflow.path)}
                  pinnedIndex={pinnedWorkflows.findIndex((w) => w.path === workflow.path)}
                  pinnedCount={pinnedWorkflows.length}
                  togglePin={togglePin}
                  moveUp={moveUp}
                  moveDown={moveDown}
                />
              ))}
            </List.Section>
          )}
          <List.Section title={pinnedWorkflows.length > 0 ? "Workflows" : undefined}>
            {unpinnedWorkflows.map((workflow) => (
              <WorkflowListItem
                key={workflow.path}
                repo={repo}
                workflow={workflow}
                branch={branch}
                ownerRepo={ownerRepo}
                getRunWorkflowTarget={getRunWorkflowTarget}
                pinned={isPinned(workflow.path)}
                pinnedIndex={pinnedWorkflows.findIndex((w) => w.path === workflow.path)}
                pinnedCount={pinnedWorkflows.length}
                togglePin={togglePin}
                moveUp={moveUp}
                moveDown={moveDown}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface WorkflowListItemProps {
  repo: Repo;
  workflow: WorkflowFile;
  branch: string | undefined;
  ownerRepo: ReturnType<typeof useRunWorkflow>["ownerRepo"];
  getRunWorkflowTarget: ReturnType<typeof useRunWorkflow>["getRunWorkflowTarget"];
  pinned: boolean;
  pinnedIndex: number;
  pinnedCount: number;
  togglePin: (path: string) => void;
  moveUp: (path: string) => void;
  moveDown: (path: string) => void;
}

function WorkflowListItem({
  repo,
  workflow,
  branch,
  ownerRepo,
  getRunWorkflowTarget,
  pinned,
  pinnedIndex,
  pinnedCount,
  togglePin,
  moveUp,
  moveDown,
}: WorkflowListItemProps) {
  return (
    <List.Item
      title={workflow.name}
      subtitle={workflow.fileName}
      accessories={workflow.inputs.length > 0 ? [{ icon: Icon.SquareEllipsis, tooltip: "Requires Input" }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Run Workflow" icon={Icon.Play} target={getRunWorkflowTarget(workflow, branch)} />
          </ActionPanel.Section>
          <WorkflowFileActionPanelSection
            repoPath={repo.path}
            workflowFilePath={workflow.path}
            ownerRepo={ownerRepo}
            branch={branch}
          />
          <ActionPanel.Section>
            <Action
              title={pinned ? "Unpin Workflow" : "Pin Workflow"}
              icon={pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => togglePin(workflow.path)}
            />
            {pinned && pinnedIndex > 0 && (
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Move Up"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => moveUp(workflow.path)}
              />
            )}
            {pinned && pinnedIndex < pinnedCount - 1 && (
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => moveDown(workflow.path)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
