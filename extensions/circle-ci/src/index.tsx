import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

export default function WorkflowList() {
  const [state, setState] = useState<{ workflows: Workflow[]; loading: boolean }>({ workflows: [], loading: true });

  useEffect(() => {
    async function fetch() {
      const pipelines = await fetchPipelines();
      const workflows = await fetchWorkflows(pipelines);
      setState((oldState) => ({
        ...oldState,
        workflows: workflows,
        loading: false,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Filter workflows by project name...">
      {state.workflows.map((workflow) => (
        <WorkflowListItem key={workflow.id} workflow={workflow} />
      ))}
    </List>
  );
}

function WorkflowListItem(props: { workflow: Workflow }) {
  const workflow = props.workflow;

  return (
    <List.Item
      id={workflow.id}
      icon={{ source: Icon.Hammer, tintColor: Color.SecondaryText }}
      key={workflow.id}
      title={workflow.project_slug}
      subtitle={workflow.repository.branch}
      accessoryTitle={getWorkflowAccessoryTitle(workflow)}
      accessoryIcon={getWorkflowAccessoryIcon(workflow)}
      actions={getWorkflowActions(workflow)}
    />
  );
}

function JobList({ workflow }: { workflow: Workflow }) {
  const [state, setState] = useState<{ jobs: Job[] }>({ jobs: [] });

  useEffect(() => {
    async function fetch() {
      const jobs = await fetchJobs(workflow);
      setState((oldState) => ({
        ...oldState,
        jobs: jobs,
      }));
    }
    fetch();
  }, []);

  return (
    <List
      navigationTitle={`${workflow.project_slug} -> ${workflow.repository.branch}`}
      isLoading={state.jobs.length === 0}
    >
      {state.jobs.map((job) => (
        <JobListItem key={job.id} job={job} />
      ))}
    </List>
  );
}
function JobListItem(props: { job: Job }) {
  const job = props.job;

  return (
    <List.Item
      id={job.id}
      icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
      key={job.id}
      title={job.name}
      accessoryTitle={getJobAccessoryTitle(job)}
      accessoryIcon={getJobAccessoryIcon(job)}
    />
  );
}

async function fetchJobs(workflow: Workflow): Promise<Job[]> {
  try {
    const preferences: Preferences = getPreferenceValues();
    const response = await fetch(`https://circleci.com/api/v2/workflow/${workflow.id}/job`, {
      method: "GET",
      headers: {
        "Circle-Token": preferences.apiKey,
      },
    });

    const json = await response.json();
    return (json as Record<string, unknown>).items as Job[];
  } catch (error) {
    showToast(ToastStyle.Failure, `Could not load jobs due to ${error}`);
    return Promise.resolve([]);
  }
}

async function fetchWorkflows(pipelines: Pipeline[]): Promise<Workflow[]> {
  try {
    const preferences: Preferences = getPreferenceValues();
    const workflowsPromises = pipelines.map(async (pipeline) => {
      const response = await fetch(`https://circleci.com/api/v2/pipeline/${pipeline.id}/workflow`, {
        method: "GET",
        headers: {
          "Circle-Token": preferences.apiKey,
        },
      });

      const json = await response.json();
      const items = ((json as Record<string, unknown>).items as Workflow[]).map((workflow) => {
        workflow.repository = pipeline.vcs;
        workflow.pipeline_number = pipeline.number;
        return workflow;
      });
      return items;
    });
    const values = await Promise.all(workflowsPromises);
    return values.flat();
  } catch (error) {
    showToast(ToastStyle.Failure, `Could not load workflows due to ${error}`);
    return [];
  }
}

async function fetchPipelines(): Promise<Pipeline[]> {
  try {
    const preferences: Preferences = getPreferenceValues();
    const response = await fetch(
      "https://circleci.com/api/v2/pipeline?" +
        new URLSearchParams({
          "org-slug": preferences.orgSlug,
        }),
      {
        method: "GET",
        headers: {
          "Circle-Token": preferences.apiKey,
        },
      }
    );

    const json = await response.json();
    return (json as Record<string, unknown>).items as Pipeline[];
  } catch (error) {
    showToast(ToastStyle.Failure, `Could not load pipelines due to ${error}`);
    return Promise.resolve([]);
  }
}

function getWorkflowAccessoryTitle(workflow: Workflow): string {
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
}

function getWorkflowAccessoryIcon(workflow: Workflow): ImageLike {
  switch (workflow.status) {
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
}

function getWorkflowActions(workflow: Workflow) {
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

function getJobAccessoryIcon(job: Job): ImageLike {
  switch (job.status) {
    case JobStatus.success:
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case JobStatus.failed:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Gear, tintColor: Color.Blue };
  }
}

function getJobAccessoryTitle(job: Job): string {
  const createdAt = new Date(job.started_at).toLocaleString();
  const stoppedAt = new Date(job.stopped_at).toLocaleString();
  switch (job.status) {
    case JobStatus.success:
      return `Succeeded at ${stoppedAt}`;
    case JobStatus.running:
      return `Running since ${createdAt}`;
    case JobStatus.failed:
      return `Failed at ${stoppedAt}`;
    default:
      return "Unknown";
  }
}

interface Preferences {
  apiKey: string;
  orgSlug: string;
}

enum WorkflowStatus {
  success = "success",
  running = "running",
  not_run = "not_run",
  failed = "failed",
  error = "error",
  failing = "failing",
  on_hold = "on_hold",
  canceled = "canceled",
  unauthorized = "unauthorized",
}

type Pipeline = {
  id: string;
  vcs: Repository;
  number: number;
};

type Workflow = {
  id: string;
  created_at: string;
  stopped_at: number;
  status: WorkflowStatus;
  project_slug: string;
  repository: Repository;
  pipeline_number: number;
};

type Repository = {
  branch: string;
  provider_name: string;
  target_repository_url: string;
};

enum JobStatus {
  success = "success",
  failed = "failed",
  running = "running",
}

type Job = {
  id: string;
  started_at: string;
  stopped_at: string;
  project_slug: string;
  name: string;
  status: JobStatus;
};
