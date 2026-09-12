import {
  Action,
  ActionPanel,
  getSelectedFinderItems,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { RenameJob, RenameResult, JobExecution } from "./types";
import { JobStorage, ExecutionHistory } from "./utils/storage";
import { RegexProcessor } from "./utils/regex-processor";
import { initializePredefinedJobs } from "./utils/predefined-jobs";
import JobExecutionResults from "./components/JobExecutionResults";

export default function RunJob() {
  const [jobs, setJobs] = useState<RenameJob[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobsAndItems();
  }, []);

  async function loadJobsAndItems() {
    try {
      setIsLoading(true);
      await initializePredefinedJobs();

      // Load jobs
      const allJobs = await JobStorage.getAllJobs();
      setJobs(allJobs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));

      // Get selected items from Finder
      try {
        const finderItems = await getSelectedFinderItems();
        setSelectedItems(finderItems.map((item) => item.path));
      } catch (error) {
        console.log("No Finder items selected:", error);
        setSelectedItems([]);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function executeJob(job: RenameJob) {
    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select files or folders in Finder and try again",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running "${job.name}"`,
      message: `Processing ${selectedItems.length} items...`,
    });

    try {
      const results: RenameResult[] = [];

      for (const itemPath of selectedItems) {
        const result = await RegexProcessor.processItem(itemPath, job.rules);
        results.push(result);
      }

      const successCount = results.filter((r) => r.success && r.originalName !== r.newName).length;
      const skippedCount = results.filter((r) => r.success && r.originalName === r.newName).length;
      const failureCount = results.filter((r) => !r.success).length;

      // Save execution to history
      const execution: JobExecution = {
        jobId: job.id,
        jobName: job.name,
        executedAt: new Date(),
        results,
        successCount,
        failureCount,
        skippedCount,
      };
      await ExecutionHistory.addExecution(execution);

      // Copy results to clipboard
      const resultsText = results
        .filter((r) => r.success && r.originalName !== r.newName)
        .map((r) => `${r.originalName} → ${r.newName}`)
        .join("\n");

      if (resultsText) {
        await Clipboard.copy(resultsText);
      }

      toast.style = successCount > 0 ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = `Job completed`;
      toast.message = `${successCount} renamed, ${skippedCount} skipped, ${failureCount} failed`;

      // Show results in detail view
      if (results.length > 0) {
        return <JobExecutionResults execution={execution} />;
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to execute job",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function JobListItem({ job }: { job: RenameJob }) {
    const isPredefined = ["slugify-filenames", "clean-filenames"].includes(job.id);

    // Preview what would happen to the first few selected items
    const previewItems = selectedItems
      .slice(0, 3)
      .map((path) => path.split("/").pop() || "")
      .filter(Boolean);
    const previews = previewItems.length > 0 ? RegexProcessor.previewChanges(previewItems, job.rules) : [];
    const hasChanges = previews.some((p) => p.hasChanges);

    return (
      <List.Item
        title={job.name}
        subtitle={job.description}
        icon={{ source: Icon.Gear, tintColor: isPredefined ? Color.Blue : Color.Green }}
        accessories={[
          { text: `${job.rules.length} rules` },
          ...(hasChanges
            ? [{ icon: Icon.CheckCircle, tooltip: "Will make changes" }]
            : previewItems.length > 0
              ? [{ icon: Icon.Circle, tooltip: "No changes needed" }]
              : []),
        ]}
        actions={
          <ActionPanel>
            <Action title="Run Job" icon={Icon.Play} onAction={() => executeJob(job)} />
            <Action.Push
              title="Preview Changes"
              icon={Icon.Eye}
              target={<PreviewChanges job={job} selectedItems={selectedItems} />}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Run Rename Job" searchBarPlaceholder="Search jobs...">
      {selectedItems.length === 0 ? (
        <List.EmptyView
          title="No files selected"
          description="Select files or folders in Finder to rename them with regex jobs"
          icon={Icon.Finder}
        />
      ) : jobs.length === 0 ? (
        <List.EmptyView
          title="No rename jobs"
          description="Create rename jobs first to process your files"
          icon={Icon.Gear}
        />
      ) : (
        <List.Section title={`Processing ${selectedItems.length} selected items`}>
          {jobs.map((job) => (
            <JobListItem key={job.id} job={job} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Preview component
function PreviewChanges({ job, selectedItems }: { job: RenameJob; selectedItems: string[] }) {
  const filenames = selectedItems.map((path) => path.split("/").pop() || "").filter(Boolean);
  const previews = RegexProcessor.previewChanges(filenames, job.rules);

  return (
    <List navigationTitle={`Preview: ${job.name}`}>
      {previews.map((preview, index) => (
        <List.Item
          key={index}
          title={preview.original}
          subtitle={preview.hasChanges ? `→ ${preview.preview}` : "No changes"}
          icon={preview.hasChanges ? Icon.ArrowRight : Icon.Circle}
          accessories={preview.appliedRules.length > 0 ? [{ text: `${preview.appliedRules.length} rules` }] : undefined}
        />
      ))}
    </List>
  );
}
