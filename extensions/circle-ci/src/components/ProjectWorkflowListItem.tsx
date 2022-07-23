import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction,
} from "@raycast/api";
import { Workflow, WorkflowStatus } from "../types";
import { JobList } from "./JobList";

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

const getWorkflowActions = (workflow: Workflow) => {
  const workflowUrl = `https://app.circleci.com/pipelines/workflows/${workflow.id}`;
  const url = workflow.repository.target_repository_url;

  return (
    <ActionPanel>
      <PushAction icon={Icon.Binoculars} title="Workflow Job List" target={<JobList workflow={workflow} />} />
      <OpenInBrowserAction title="Open Workflow" url={workflowUrl} />
      <CopyToClipboardAction title="Copy Workflow URL" content={workflowUrl} />
      {url && <OpenInBrowserAction title="Open PR" url={url} />}
      {url && <CopyToClipboardAction title="Copy PR URL" content={url} />}
    </ActionPanel>
  );
};

const getWorkflowAccessoryIcon = ({ status }: { status: WorkflowStatus }): ImageLike => {
  switch (status) {
    case WorkflowStatus.success:
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case WorkflowStatus.running:
      return { source: Icon.Gear, tintColor: Color.Blue };
    case WorkflowStatus.not_run:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case WorkflowStatus.failed:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    case WorkflowStatus.error:
      return { source: Icon.XmarkCircle, tintColor: Color.Orange };
    case WorkflowStatus.failing:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    case WorkflowStatus.on_hold:
      return { source: Icon.Clock, tintColor: Color.Blue };
    case WorkflowStatus.canceled:
      return { source: Icon.XmarkCircle, tintColor: Color.SecondaryText };
    case WorkflowStatus.unauthorized:
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return { source: Icon.Gear, tintColor: Color.Blue };
  }
};
