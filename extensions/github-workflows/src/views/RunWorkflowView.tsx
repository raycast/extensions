import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Repo } from "../lib/git";
import { listDispatchableWorkflows } from "../lib/workflows";
import { useRunWorkflow } from "../hooks/useRunWorkflow";
import WorkflowFileActionPanelSection from "../components/WorkflowFileActionPanelSection";

interface RunWorkflowViewProps {
  repo: Repo;
}

export default function RunWorkflowView({ repo }: RunWorkflowViewProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);

  const { data: workflows = [], isLoading: isLoadingWorkflows } = useCachedPromise(
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

  const isLoading = isLoadingWorkflows || isLoadingBranches;

  const branch = selectedBranch ?? currentBranch ?? branches[0];

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
      {workflows.length === 0 ? (
        <List.EmptyView
          title="No Dispatchable Workflows Found"
          description={`No workflows in ${repo.name} declare a workflow_dispatch trigger.`}
        />
      ) : (
        <List.Section title="Workflows">
          {workflows.map((workflow) => (
            <List.Item
              key={workflow.fileName}
              title={workflow.name}
              subtitle={workflow.fileName}
              accessories={workflow.inputs.length > 0 ? [{ text: `${workflow.inputs.length} input(s)` }] : []}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Run Workflow"
                      icon={Icon.Play}
                      target={getRunWorkflowTarget(workflow, branch)}
                    />
                  </ActionPanel.Section>
                  <WorkflowFileActionPanelSection
                    repoPath={repo.path}
                    workflowFilePath={workflow.path}
                    ownerRepo={ownerRepo}
                    branch={branch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
