import { Detail, ActionPanel, Action, Icon, getPreferenceValues, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WorkflowRun, Preferences } from "../types";
import { GitHubService } from "../services/github";
import { getWorkflowStatusIcon } from "../utils";

interface WorkflowDetailViewProps {
  workflowRun: WorkflowRun;
}

interface JobInfo {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at?: string;
  logs?: string;
  error?: string;
}

export function WorkflowDetailView({ workflowRun }: WorkflowDetailViewProps) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const preferences = getPreferenceValues<Preferences>();
  const githubService = new GitHubService(preferences);

  useEffect(() => {
    fetchWorkflowLogs();
    const interval = setInterval(fetchWorkflowLogs, 5000);
    return () => clearInterval(interval);
  }, [workflowRun.id]);

  async function fetchWorkflowLogs() {
    try {
      const jobsResponse = await githubService.fetchWorkflowJobs(workflowRun.id);
      const jobsData: JobInfo[] = [];

      for (const job of jobsResponse.data.jobs) {
        const jobInfo: JobInfo = {
          id: job.id,
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          started_at: job.started_at,
          completed_at: job.completed_at,
        };

        try {
          const logsResponse = await githubService.fetchJobLogs(job.id);
          jobInfo.logs = logsResponse.data;
        } catch {
          jobInfo.error = "Could not fetch logs (job may still be queued)";
        }

        jobsData.push(jobInfo);
      }

      setJobs(jobsData);
      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (fetchError) {
      console.error("Error fetching workflow logs:", fetchError);
      setIsLoading(false);
    }
  }

  function getJobStatusIcon(status: string, conclusion?: string | null): string {
    if (status === "completed") {
      return conclusion === "success" ? "✅" : conclusion === "failure" ? "❌" : "⚠️";
    }
    return status === "in_progress" ? "🔄" : "⏸️";
  }

  function formatDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  }

  const statusIcon = getWorkflowStatusIcon(workflowRun.status, workflowRun.conclusion);
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const successfulJobs = jobs.filter((job) => job.conclusion === "success").length;
  const failedJobs = jobs.filter((job) => job.conclusion === "failure").length;

  // Create beautiful markdown content with GitHub-like styling
  let markdown = `# ${statusIcon} ${workflowRun.name}

> **Workflow Run #${workflowRun.run_number}** • \`${workflowRun.head_branch}\` • \`${workflowRun.head_sha.substring(0, 7)}\`

${
  workflowRun.status === "completed"
    ? workflowRun.conclusion === "success"
      ? "✅ **COMPLETED SUCCESSFULLY**"
      : workflowRun.conclusion === "failure"
        ? "❌ **FAILED**"
        : "⚠️ **COMPLETED WITH ISSUES**"
    : workflowRun.status === "in_progress"
      ? "🔄 **IN PROGRESS**"
      : "⏳ **QUEUED**"
}

---

## 📊 Progress Overview

| Metric | Value |
|--------|-------|
| **Total Jobs** | ${totalJobs} |
| **Completed** | ${completedJobs}/${totalJobs} (${totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0}%) |
| **Successful** | ${successfulJobs} ✅ |
| **Failed** | ${failedJobs} ❌ |
| **Duration** | ${formatDuration(workflowRun.created_at, workflowRun.updated_at)} |

${
  totalJobs > 0
    ? `
### Progress Bar
${"█".repeat(Math.max(1, Math.floor((completedJobs / totalJobs) * 20)))}${"░".repeat(Math.max(0, 20 - Math.floor((completedJobs / totalJobs) * 20)))} ${Math.round((completedJobs / totalJobs) * 100)}%
`
    : ""
}

---

## 🔧 Job Execution Details`;

  // Add each job with beautiful formatting
  jobs.forEach((job) => {
    const jobIcon = getJobStatusIcon(job.status, job.conclusion);
    const duration = formatDuration(job.started_at, job.completed_at);
    const statusBadge =
      job.status === "completed"
        ? job.conclusion === "success"
          ? "![success](https://img.shields.io/badge/status-success-green)"
          : "![failed](https://img.shields.io/badge/status-failed-red)"
        : job.status === "in_progress"
          ? "![in_progress](https://img.shields.io/badge/status-running-blue)"
          : "![queued](https://img.shields.io/badge/status-queued-yellow)";

    markdown += `

### ${jobIcon} \`${job.name}\`

${statusBadge}

| | |
|---|---|
| **Status** | \`${job.status.toUpperCase()}\`${job.conclusion ? ` → \`${job.conclusion.toUpperCase()}\`` : ""} |
| **Duration** | ${duration} |
| **Started** | ${new Date(job.started_at).toLocaleString()} |
${job.completed_at ? `| **Completed** | ${new Date(job.completed_at).toLocaleString()} |` : ""}

`;

    if (job.logs) {
      // Clean and format logs better
      const logLines = job.logs.split("\n");
      const importantLines = logLines.filter(
        (line) =>
          line.includes("Error") ||
          line.includes("Warning") ||
          line.includes("✓") ||
          line.includes("×") ||
          line.includes("BUILD") ||
          line.includes("SUCCESS") ||
          line.includes("FAIL"),
      );

      // Show important lines first, then expandable full logs
      if (importantLines.length > 0) {
        markdown += `**📋 Key Output:**
\`\`\`
${importantLines.slice(0, 5).join("\n")}${importantLines.length > 5 ? "\n... and more" : ""}
\`\`\`

`;
      }

      // Truncate very long logs for better performance
      const logContent =
        job.logs.length > 3000
          ? job.logs.substring(0, 3000) + "\n\n... (logs truncated for performance, view full logs in GitHub)"
          : job.logs;

      markdown += `<details>
<summary>🔍 <strong>View Full Logs</strong> (${Math.round(job.logs.length / 1024)}KB)</summary>

\`\`\`bash
${logContent}
\`\`\`

</details>

`;
    } else if (job.error) {
      markdown += `
> ⚠️ **Error:** ${job.error}
> 
> This job may still be queued or starting up. Logs will appear when execution begins.

`;
    } else {
      markdown += `
> 🔄 **Waiting for logs...**
> 
> This job is preparing to run or is still in queue.

`;
    }
  });

  // Add a beautiful footer with refresh info
  const isActive = workflowRun.status === "in_progress" || workflowRun.status === "queued";
  markdown += `

---

## 📡 Live Status

${isActive ? "🟢 **Live updating** - This workflow is actively running" : "🔴 **Completed** - Workflow has finished execution"}

| | |
|---|---|
| **Last Refresh** | ${lastRefresh.toLocaleTimeString()} |
| **Auto Refresh** | ${isActive ? "Every 5 seconds ⚡" : "Disabled (workflow complete)"} |
| **GitHub Link** | [View on GitHub →](${workflowRun.html_url}) |

${
  isActive
    ? `
> 💡 **Tip:** Press \`Cmd+R\` to refresh manually or wait for automatic updates
`
    : `
> ✨ **Workflow completed!** Final status: **${workflowRun.conclusion?.toUpperCase() || workflowRun.status.toUpperCase()}**
`
}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`${workflowRun.name} #${workflowRun.run_number}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={workflowRun.status} icon={statusIcon} />
          {workflowRun.conclusion && (
            <Detail.Metadata.Label
              title="Conclusion"
              text={workflowRun.conclusion}
              icon={workflowRun.conclusion === "success" ? "✅" : "❌"}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Run Number" text={`#${workflowRun.run_number}`} />
          <Detail.Metadata.Label title="Branch" text={workflowRun.head_branch} />
          <Detail.Metadata.Label title="Commit" text={workflowRun.head_sha.substring(0, 7)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={new Date(workflowRun.created_at).toLocaleString()} />
          {workflowRun.updated_at !== workflowRun.created_at && (
            <Detail.Metadata.Label title="Updated" text={new Date(workflowRun.updated_at).toLocaleString()} />
          )}
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(workflowRun.created_at, workflowRun.updated_at)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Jobs" text={totalJobs.toString()} />
          <Detail.Metadata.Label title="Completed" text={`${completedJobs}/${totalJobs}`} />
          {successfulJobs > 0 && (
            <Detail.Metadata.Label title="Successful" text={successfulJobs.toString()} icon="✅" />
          )}
          {failedJobs > 0 && <Detail.Metadata.Label title="Failed" text={failedJobs.toString()} icon="❌" />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in GitHub" url={workflowRun.html_url} icon={Icon.Globe} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={fetchWorkflowLogs}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Copy Workflow URL"
            icon={Icon.Link}
            onAction={async () => {
              await Clipboard.copy(workflowRun.html_url);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to Clipboard",
                message: "Workflow URL copied",
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Copy Commit Sha"
            icon={Icon.Code}
            onAction={async () => {
              await Clipboard.copy(workflowRun.head_sha);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to Clipboard",
                message: "Commit SHA copied",
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {jobs.length > 0 && (
            <Action
              title="Copy All Logs"
              icon={Icon.Document}
              onAction={async () => {
                const allLogs = jobs
                  .map((job) => `=== ${job.name} ===\n${job.logs || job.error || "No logs available"}`)
                  .join("\n\n");
                await Clipboard.copy(allLogs);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied to Clipboard",
                  message: "All logs copied",
                });
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
