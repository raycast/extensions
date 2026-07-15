import { Action, ActionPanel, Alert, confirmAlert, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { RenameJob } from "./types";
import { JobStorage } from "./utils/storage";
import { initializePredefinedJobs } from "./utils/predefined-jobs";
import CreateJobForm from "./components/CreateJobForm";
import EditJobForm from "./components/EditJobForm";
import JobDetailView from "./components/JobDetailView";
import { showFailureToast } from "@raycast/utils";

export default function ManageJobs() {
  const [jobs, setJobs] = useState<RenameJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setIsLoading(true);
      await initializePredefinedJobs();
      const allJobs = await JobStorage.getAllJobs();
      setJobs(allJobs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      showFailureToast(error, { title: "Failed to load jobs" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteJob(job: RenameJob) {
    const confirmed = await confirmAlert({
      title: "Delete Job",
      message: `Are you sure you want to delete "${job.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await JobStorage.deleteJob(job.id);
        await loadJobs();
        await showToast({
          style: Toast.Style.Success,
          title: "Job deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete job",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleDuplicateJob(job: RenameJob) {
    try {
      await JobStorage.duplicateJob(job.id);
      await loadJobs();
      await showToast({
        style: Toast.Style.Success,
        title: "Job duplicated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate job",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function JobListItem({ job }: { job: RenameJob }) {
    const isPredefined = ["slugify-filenames", "clean-filenames"].includes(job.id);

    return (
      <List.Item
        title={job.name}
        subtitle={job.description}
        icon={{ source: Icon.Gear, tintColor: isPredefined ? Color.Blue : Color.Green }}
        accessories={[{ text: `${job.rules.length} rules` }, { date: job.updatedAt }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<JobDetailView job={job} onJobUpdated={loadJobs} />}
            />
            <Action.Push
              title="Edit Job"
              icon={Icon.Pencil}
              target={<EditJobForm job={job} onJobSaved={loadJobs} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <ActionPanel.Section>
              <Action
                title="Duplicate Job"
                icon={Icon.Duplicate}
                onAction={() => handleDuplicateJob(job)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Delete Job"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteJob(job)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Rename Jobs"
      searchBarPlaceholder="Search jobs..."
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.Push
              title="Create New Job"
              icon={Icon.Plus}
              target={<CreateJobForm onJobSaved={loadJobs} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        )
      }
    >
      {jobs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No rename jobs"
          description="Create your first rename job to get started"
          actions={
            <ActionPanel>
              <Action.Push title="Create New Job" icon={Icon.Plus} target={<CreateJobForm onJobSaved={loadJobs} />} />
            </ActionPanel>
          }
        />
      ) : (
        jobs.map((job) => <JobListItem key={job.id} job={job} />)
      )}
    </List>
  );
}
