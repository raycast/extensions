import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { requestRerunFailed, requestRerunJob } from "../data";
import { describeError } from "../lib/errors";
import { Check, failingRunIds, QueueEntry } from "../lib/queue";

async function runWithToast(title: string, work: () => Promise<void>, onDone?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await work();
    toast.style = Toast.Style.Success;
    toast.title = "Rerun requested";
    onDone?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't rerun";
    toast.message = describeError(error).description;
  }
}

export async function confirmRerunFailedForEntry(entry: QueueEntry, onDone?: () => void) {
  const runIds = failingRunIds(entry);
  if (runIds.length === 0) {
    return;
  }
  const names = [...entry.failingRequired, ...entry.failingOptional].map((check) => check.name).join(", ");
  const confirmed = await confirmAlert({
    title: `Rerun failed jobs for #${entry.pr.number}?`,
    message: `${names}\n\nReruns every failed job in ${runIds.length === 1 ? "its workflow run" : `${runIds.length} workflow runs`}.`,
    primaryAction: { title: "Rerun", style: Alert.ActionStyle.Default },
  });
  if (!confirmed) {
    return;
  }
  await runWithToast("Requesting rerun…", () => requestRerunFailed(runIds), onDone);
}

export async function confirmRerunJob(check: Check, onDone?: () => void) {
  if (check.jobId === undefined) {
    return;
  }
  const jobId = check.jobId;
  const confirmed = await confirmAlert({
    title: `Rerun ${check.name}?`,
    message: "Reruns this job and any jobs it depends on.",
    primaryAction: { title: "Rerun", style: Alert.ActionStyle.Default },
  });
  if (confirmed) {
    await runWithToast(`Rerunning ${check.name}…`, () => requestRerunJob(jobId), onDone);
  }
}

export async function confirmRerunFailedInRun(check: Check, onDone?: () => void) {
  if (check.runId === undefined) {
    return;
  }
  const runId = check.runId;
  const confirmed = await confirmAlert({
    title: "Rerun all failed jobs in this run?",
    message: `${check.workflow ?? "Workflow"} run ${runId}`,
    primaryAction: { title: "Rerun", style: Alert.ActionStyle.Default },
  });
  if (confirmed) {
    await runWithToast("Requesting rerun…", () => requestRerunFailed([runId]), onDone);
  }
}
