import { Action, ActionPanel, Icon } from "@raycast/api";
import { Repo } from "../lib/git";
import RepoRunsList from "../views/RepoRunsList";

interface ListWorkflowsActionPanelSectionProps {
  repo: Repo;
}

/** Command-specific actions for the "List Workflows" command: viewing a repo's run history. */
export default function ListWorkflowsActionPanelSection({ repo }: ListWorkflowsActionPanelSectionProps) {
  if (!repo.hasWorkflows) return null;

  return (
    <ActionPanel.Section>
      <Action.Push title="View Runs" icon={Icon.List} target={<RepoRunsList repo={repo} />} />
    </ActionPanel.Section>
  );
}
