import { List, showToast, Toast, ActionPanel, Action, Icon, Color, confirmAlert } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { returnJobs } from "./fetch_jobs";
import { JobsFetchResponse, JobModel } from "./types";
import { buildDbtCloudUrl, triggerJobRun } from "./api";

function getJobIcon(job: JobModel): { source: Icon; tintColor: Color } {
  if (job.deactivated) {
    return { source: Icon.XmarkCircle, tintColor: Color.Red };
  }
  if (job.triggers?.schedule) {
    return { source: Icon.Clock, tintColor: Color.Blue };
  }
  return { source: Icon.Hammer, tintColor: Color.Green };
}

interface TriggerJobItemProps {
  job: JobModel;
  onTrigger: () => void;
}

const TriggerJobItem = ({ job, onTrigger }: TriggerJobItemProps): JSX.Element => {
  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
  const jobIcon = getJobIcon(job);

  const handleTrigger = async () => {
    const confirmed = await confirmAlert({
      title: "Trigger Job Run",
      message: `Are you sure you want to trigger "${job.name}"?`,
      primaryAction: {
        title: "🚀 Trigger Now",
      },
    });

    if (confirmed) {
      const result = await triggerJobRun(job.id, "Triggered from Raycast Quick Trigger");
      if (result) {
        onTrigger();
      }
    }
  };

  const recentRunStatus = job.most_recent_run?.status_humanized;
  const statusEmoji =
    recentRunStatus === "Success"
      ? "🎉"
      : recentRunStatus === "Error"
      ? "❌"
      : recentRunStatus === "Running"
      ? "🏃"
      : "⏸️";

  return (
    <List.Item
      id={job.id.toString()}
      title={job.name}
      subtitle={job.project?.name || `Project ${job.project_id}`}
      icon={jobIcon}
      accessories={[
        { text: `Last: ${statusEmoji}` },
        ...(job.next_run_humanized ? [{ text: `Next: ${job.next_run_humanized}` }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action title="🚀 Trigger Job Run" icon={Icon.Terminal} onAction={handleTrigger} />
          <Action.OpenInBrowser url={jobUrl} title="Open in dbt Cloud" />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function TriggerJobCommand() {
  const [jobs, setJobs] = useState<JobsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnJobs();
      // Filter to only active jobs
      const activeJobs = response.filter((job) => !job.deactivated);
      setJobs(activeJobs);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading Jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group jobs by project
  const jobsByProject = jobs.reduce((acc, job) => {
    const projectKey = job.project?.name || `Project ${job.project_id}`;
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(job);
    return acc;
  }, {} as Record<string, JobModel[]>);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search jobs to trigger..." throttle>
      <List.EmptyView
        title="No active jobs found"
        description="Create a job in dbt Cloud to get started"
        icon="icon_64p.png"
      />

      {Object.entries(jobsByProject).map(([projectName, projectJobs]) => (
        <List.Section key={projectName} title={projectName} subtitle={`${projectJobs.length} jobs`}>
          {projectJobs.map((job) => (
            <TriggerJobItem key={job.id} job={job} onTrigger={fetchData} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
