import { Action, ActionPanel, Icon } from "@raycast/api";
import { Repo } from "../lib/git";
import WorkflowsListView from "../views/WorkflowsListView";

interface RunWorkflowActionPanelSectionProps {
  repo: Repo;
}

/** Command-specific actions for the "Run Workflow" command: dispatching a workflow_dispatch workflow. */
export default function RunWorkflowActionPanelSection({ repo }: RunWorkflowActionPanelSectionProps) {
  if (!repo.hasWorkflows) return null;

  return (
    <ActionPanel.Section>
      <Action.Push title="View Workflows" icon={Icon.Play} target={<WorkflowsListView repo={repo} />} />
    </ActionPanel.Section>
  );
}
