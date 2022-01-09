import { Workflow, WorkflowStatus } from "../types";
import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction
} from "@raycast/api";
import { JobList } from "./JobList";

export const WorkflowListItem = ({ workflow }: { workflow: Workflow }) =>
  <List.Item
    id={workflow.id}
    icon={{ source: Icon.Hammer, tintColor: Color.SecondaryText }}
    key={workflow.id}
    title={workflow.project_slug}
    subtitle={workflow.repository.branch}
    accessoryTitle={getWorkflowAccessoryTitle(workflow)}
    accessoryIcon={getWorkflowAccessoryIcon(workflow)}
    actions={getWorkflowActions(workflow)}
  />;


export const getWorkflowActions = (workflow: Workflow) => {
  const workflowUrl = `https://app.circleci.com/pipelines/workflows/${workflow.id}`;
  if (!workflow.repository.target_repository_url) {
    return (
      <ActionPanel>
        <PushAction icon={Icon.Binoculars} title="Workflow Job List" target={<JobList workflow={workflow} />} />
        <OpenInBrowserAction title="Open Workflow" url={workflowUrl} />
        <CopyToClipboardAction title="Copy Workflow URL" content={workflowUrl} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <PushAction icon={Icon.Binoculars} title="Workflow Job List" target={<JobList workflow={workflow} />} />
        <OpenInBrowserAction title="Open Workflow" url={workflowUrl} />
        <CopyToClipboardAction title="Copy Workflow URL" content={workflowUrl} />
        <OpenInBrowserAction title="Open PR" url={workflow.repository.target_repository_url} />
        <CopyToClipboardAction title="Copy PR URL" content={workflow.repository.target_repository_url} />
      </ActionPanel>
    );
  }
}



const getWorkflowAccessoryTitle = (workflow: Workflow): string => {
  const createdAt = new Date(workflow.created_at).toLocaleString();
  const stoppedAt = new Date(workflow.stopped_at).toLocaleString();

  switch (workflow.status) {
    case WorkflowStatus.success:
      return `Succeeded at ${stoppedAt}`;
    case WorkflowStatus.running:
      return `Running since ${createdAt}`;
    case WorkflowStatus.not_run:
      return "Not run";
    case WorkflowStatus.failed:
      return `Failed at ${stoppedAt}`;
    case WorkflowStatus.error:
      return `Error at ${stoppedAt}`;
    case WorkflowStatus.failing:
      return `Failing since ${createdAt}`;
    case WorkflowStatus.on_hold:
      return `On hold since ${createdAt}`;
    case WorkflowStatus.canceled:
      return `Canceled at ${stoppedAt}`;
    case WorkflowStatus.unauthorized:
      return `Unauthorized at ${stoppedAt}`;
    default:
      return "Unknown";
  }
};


export const getWorkflowAccessoryIcon = ({ status }: { status: WorkflowStatus }): ImageLike => {
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

