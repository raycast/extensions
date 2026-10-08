import { Color, Detail, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadJob, loadLogSummary, LogJob } from "../data";
import { logErrorMessage } from "../lib/errors";
import { formatSeconds, secondsBetween } from "../lib/format";
import { jobState } from "../lib/jobs";
import { Check, PullRequestSummary } from "../lib/queue";
import { currentStep, failedStep, failingStepName, failureUrl, JobReportInput, LogState } from "../lib/report";
import { checkLabel } from "./presentation";

export type MetadataRow =
  | { kind: "tags"; title: string; tags: { text: string; color: Color }[] }
  | { kind: "label"; title: string; text: string }
  | { kind: "link"; title: string; text: string; target: string }
  | { kind: "separator" };

export function statusColor(check: Check): Color {
  switch (check.state) {
    case "failure":
      return check.required ? Color.Red : Color.Orange;
    case "pending":
      return Color.Yellow;
    case "success":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

export function useJobReport(props: {
  check: Check;
  pr?: PullRequestSummary;
  repo?: string;
  sha?: string;
  enabled: boolean;
  wantLog: boolean;
}) {
  const hasJob = props.check.jobId !== undefined;
  const jobId = props.check.jobId ?? 0;
  const details = useCachedPromise(loadJob, [jobId], { execute: props.enabled && hasJob });
  const job = props.enabled ? details.data?.job : undefined;
  const finished = job?.status === "completed";
  const step = failedStep(job);
  const stepRef = step ? { name: step.name, startedAt: step.startedAt } : undefined;
  const logJob: LogJob = {
    id: jobId,
    runId: job?.runId ?? 0,
    name: job?.name ?? props.check.name,
    workflowName: job?.workflowName,
    headSha: job?.headSha,
  };
  const logOptions = { execute: props.enabled && props.wantLog && finished, keepPreviousData: true };
  const quickLog = useCachedPromise(loadLogSummary, [logJob, stepRef, false], logOptions);
  const comparedLog = useCachedPromise(loadLogSummary, [logJob, stepRef, true], logOptions);
  const log = { data: comparedLog.data ?? quickLog.data, error: comparedLog.data ? undefined : quickLog.error };

  let logState: LogState;
  const logEnabled = props.enabled && props.wantLog;
  if (logEnabled && log.error) {
    logState = { status: "error", message: logErrorMessage(log.error) };
  } else if (logEnabled && log.data) {
    logState = { status: "loaded", summary: log.data };
  } else if (job && !finished) {
    logState = { status: "unavailable", reason: "Still running. The log is available once the job finishes." };
  } else if (props.wantLog) {
    logState = { status: "loading" };
  } else {
    logState = { status: "idle" };
  }

  const check: Check = job
    ? { ...props.check, state: jobState(job), conclusion: job.conclusion ?? job.status }
    : props.check;
  const input: JobReportInput = {
    check,
    pr: props.pr,
    job,
    annotations: props.enabled ? details.data?.annotations : undefined,
    log: logState,
    repo: props.repo,
    sha: props.sha,
  };
  return {
    input,
    job,
    isLoading: details.isLoading || quickLog.isLoading || comparedLog.isLoading,
    failureUrl: failureUrl(job, logState, check.url),
    revalidate: () => {
      details.revalidate();
      if (props.wantLog && finished) {
        quickLog.revalidate();
        comparedLog.revalidate();
      }
    },
  };
}

export function metadataRows(
  input: JobReportInput,
  url: string | undefined,
  options: { compact?: boolean } = {},
): MetadataRow[] {
  const { check, job, pr } = input;
  const rows: MetadataRow[] = [
    {
      kind: "tags",
      title: "Status",
      tags: [
        { text: checkLabel(check), color: statusColor(check) },
        ...(check.state === "failure"
          ? [{ text: check.required ? "Required" : "Optional", color: check.required ? Color.Red : Color.Orange }]
          : []),
      ],
    },
  ];
  const stepName = failingStepName(job, input.log.status === "loaded" ? input.log.summary : undefined);
  const running = currentStep(job);
  if (check.state === "failure" && url) {
    rows.push({ kind: "link", title: "Failure", text: stepName ?? "Open on GitHub", target: url });
  } else if (running && url) {
    rows.push({ kind: "link", title: "Running", text: running.name, target: url });
  } else if (url) {
    rows.push({ kind: "link", title: "Details", text: "Open on GitHub", target: url });
  }
  const seconds = job
    ? secondsBetween(job.startedAt, job.completedAt ?? new Date())
    : secondsBetween(check.startedAt, check.completedAt ?? (check.state === "pending" ? new Date() : undefined));
  if (seconds !== undefined && !options.compact) {
    rows.push({ kind: "label", title: "Duration", text: formatSeconds(seconds) });
  }
  if (job) {
    rows.push({ kind: "link", title: "Run", text: `Attempt ${job.runAttempt}`, target: job.runUrl });
  }
  if (pr && !options.compact) {
    rows.push({ kind: "separator" }, { kind: "link", title: "Pull Request", text: `#${pr.number}`, target: pr.url });
  }
  return rows;
}

export function ListMetadata(props: { rows: MetadataRow[] }) {
  const M = List.Item.Detail.Metadata;
  return (
    <M>
      {props.rows.map((row, index) => {
        switch (row.kind) {
          case "tags":
            return (
              <M.TagList key={index} title={row.title}>
                {row.tags.map((tag) => (
                  <M.TagList.Item key={tag.text} text={tag.text} color={tag.color} />
                ))}
              </M.TagList>
            );
          case "label":
            return <M.Label key={index} title={row.title} text={row.text} />;
          case "link":
            return <M.Link key={index} title={row.title} text={row.text} target={row.target} />;
          case "separator":
            return <M.Separator key={index} />;
        }
      })}
    </M>
  );
}

export function DetailMetadata(props: { rows: MetadataRow[] }) {
  const M = Detail.Metadata;
  return (
    <M>
      {props.rows.map((row, index) => {
        switch (row.kind) {
          case "tags":
            return (
              <M.TagList key={index} title={row.title}>
                {row.tags.map((tag) => (
                  <M.TagList.Item key={tag.text} text={tag.text} color={tag.color} />
                ))}
              </M.TagList>
            );
          case "label":
            return <M.Label key={index} title={row.title} text={row.text} />;
          case "link":
            return <M.Link key={index} title={row.title} text={row.text} target={row.target} />;
          case "separator":
            return <M.Separator key={index} />;
        }
      })}
    </M>
  );
}
