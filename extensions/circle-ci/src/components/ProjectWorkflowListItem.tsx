import { List } from "@raycast/api";
import { Workflow } from "../types";
import { getWorkflowAccessoryIcon, getWorkflowActions } from "./WorkflowListItem";

export const ProjectWorkflowListItem = ({ workflow }: { workflow: Workflow }) => (
  <List.Item
    icon={getWorkflowAccessoryIcon({ status: workflow.status })}
    title={workflow.name}
    subtitle={workflow.pipeline?.vcs.tag || workflow.pipeline?.vcs.branch}
    accessoryIcon={workflow.pipeline?.trigger.actor.avatar_url || undefined}
    accessoryTitle={new Date(workflow.stopped_at ? workflow.stopped_at : workflow.created_at).toLocaleTimeString()}
    actions={getWorkflowActions(workflow)}
  />
);
