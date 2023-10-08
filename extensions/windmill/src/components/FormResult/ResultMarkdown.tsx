import { WorkspaceConfig } from "../../types";
import { JobDetails } from "./getJobDetails";

export function ResultMarkdown(workspace: WorkspaceConfig, details: JobDetails, result: string): string {
  const jobUrl = `${workspace.remoteURL}run/${details.id}?workspace=${workspace.workspaceId}`;
  const totalSteps = details.flow_status?.modules?.length || 1;
  const currentStep = details.flow_status?.step || 0;

  const jobKind = details.job_kind;

  let status = "Queued";
  if (details.type === "CompletedJob") {
    status = "Completed";
  } else if (details.running) {
    status = "Running";
  }
  if (details.canceled) {
    status = "Canceled";
  }

  let progress;
  if (jobKind === "flow") {
    progress = Math.floor((currentStep / totalSteps) * 100);
  } else {
    progress = Math.min(Math.floor((new Date().getTime() - new Date(details.started_at).getTime()) / 1000), 100);
  }
  if (status === "Completed") {
    progress = 100;
  }

  // Use emojis for progress bar and invert it
  let progressBar = "🟩".repeat(progress / 10) + "⬜".repeat(10 - progress / 10);

  if (status === "Canceled" || (status === "Completed" && details.success === false)) {
    progressBar = "🟥".repeat(10);
  }

  let progressEmoji = "⏳";
  let timeTaken = "";
  if (details.type === "CompletedJob") {
    progressEmoji = details.success ? "✅" : "❌";
    timeTaken = ` (ran in ${details.duration_ms / 1000}s)`;
  } else {
    timeTaken = ` (running for ${(new Date().getTime() - new Date(details.started_at).getTime()) / 1000}s)`;
  }
  let resultMessage = "";

  if (result.length < 4000) {
    resultMessage = `\`\`\`
${result}
\`\`\``;
  } else {
    if (status === "Completed" || status === "Canceled") {
      resultMessage =
        "\n\nResult is too long to display. You can copy the result to clipboard using the copy action, or cmd + enter";
    }
  }

  return `
📜 ${details.script_path}

👤 by ${details.created_by}

🆔 [${details.id}](${jobUrl})

📅 started: ${new Date(details.started_at).toISOString()}

${progressBar} ${progressEmoji} ${status}${timeTaken}

---

### Result
${resultMessage}
  `;
}
