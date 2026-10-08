import { formatSeconds, secondsBetween } from "./format";
import { Annotation, Job, JobStep } from "./jobs";
import { excerptAround, FoundError, LogSummary } from "./logs";
import { Check } from "./queue";

export type LogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "loaded"; summary: LogSummary }
  | { status: "error"; message: string };

export type JobReportInput = {
  check: Check;
  pr?: { number: number; title: string; url: string };
  job?: Job;
  annotations?: Annotation[];
  log: LogState;
  repo?: string;
  sha?: string;
  jobError?: string;
};

export type FailureError = { text: string; location?: string; url?: string };

const PREVIEW_LOG_LINES = 25;
const MAX_ERRORS = 15;

function inlineCode(text: string): string {
  return `\`${text.replace(/`/g, "'").replace(/\s+/g, " ").trim()}\``;
}

function fence(lines: string[]): string {
  return ["```text", lines.join("\n").replace(/```/g, "'''"), "```"].join("\n");
}

function duration(start?: string, end?: string): string | undefined {
  const seconds = secondsBetween(start, end);
  return seconds === undefined ? undefined : formatSeconds(seconds);
}

function loadedSummary(log: LogState): LogSummary | undefined {
  return log.status === "loaded" ? log.summary : undefined;
}

function blobUrl(input: Pick<JobReportInput, "repo" | "sha">, path: string, line?: number): string | undefined {
  return input.repo && input.sha
    ? `https://github.com/${input.repo}/blob/${input.sha}/${path}${line ? `#L${line}` : ""}`
    : undefined;
}

function fromLog(error: FoundError, input: Pick<JobReportInput, "repo" | "sha">): FailureError {
  if (!error.path || !error.inRepo) {
    return { text: error.text };
  }
  return {
    text: error.message,
    location: `${error.path}${error.line ? `:${error.line}` : ""}`,
    url: blobUrl(input, error.path, error.line),
  };
}

export function failureErrors(input: Pick<JobReportInput, "annotations" | "log" | "repo" | "sha">): FailureError[] {
  const errors: FailureError[] = [];
  const seen: string[] = [];
  const add = (error: FailureError) => {
    const text = error.text.replace(/\s+/g, " ").trim();
    const duplicate = seen.some((other) => other.includes(text) || (text.length >= 20 && text.includes(other)));
    if (text && !/^Process completed with exit code/.test(text) && !duplicate) {
      seen.push(text);
      errors.push({ ...error, text });
    }
  };
  for (const annotation of input.annotations ?? []) {
    if (annotation.level !== "failure") {
      continue;
    }
    const hasFile = Boolean(annotation.path) && annotation.path !== ".github";
    const location = hasFile ? `${annotation.path}${annotation.line ? `:${annotation.line}` : ""}` : undefined;
    const url = hasFile ? blobUrl(input, annotation.path, annotation.line) : undefined;
    const title = annotation.title && !location ? `${annotation.title}: ` : "";
    add({ text: `${title}${annotation.message}`, location, url });
  }
  const logErrors = loadedSummary(input.log)?.errors ?? [];
  for (const error of logErrors.filter((error) => error.fromRunner)) {
    add(fromLog(error, input));
  }
  if (errors.length === 0) {
    for (const error of logErrors.filter((error) => !error.fromRunner)) {
      add(fromLog(error, input));
    }
  }
  return errors.slice(0, MAX_ERRORS);
}

export function keyErrors(input: Pick<JobReportInput, "annotations" | "log" | "repo" | "sha">): string[] {
  return failureErrors(input).map((error) => (error.location ? `${error.location}: ${error.text}` : error.text));
}

function isFailedStep(step: JobStep): boolean {
  return step.conclusion === "failure" || step.conclusion === "timed_out";
}

export function failedStep(job: Job | undefined): JobStep | undefined {
  return job?.steps.find(isFailedStep);
}

export function failingStepName(job: Job | undefined, summary: LogSummary | undefined): string | undefined {
  return failedStep(job)?.name ?? summary?.failingStep;
}

export function currentStep(job: Job | undefined): JobStep | undefined {
  return job?.steps.find((step) => step.status === "in_progress");
}

export function failureUrl(job: Job | undefined, log: LogState, fallback?: string): string | undefined {
  const step = failedStep(job);
  if (!job) {
    return fallback;
  }
  if (!step) {
    const running = currentStep(job);
    return running ? `${job.htmlUrl}#step:${running.number}:1` : job.htmlUrl;
  }
  const line = loadedSummary(log)?.failureLine;
  return `${job.htmlUrl}#step:${step.number}${line ? `:${line}` : ":1"}`;
}

function errorLine(error: FailureError): string {
  const location = error.location
    ? error.url
      ? `[${inlineCode(error.location)}](${error.url}) `
      : `${inlineCode(error.location)} `
    : "";
  return `- ${location}${inlineCode(error.text)}`;
}

function testsLines(summary: LogSummary, compact: boolean): string[] {
  const lines: string[] = [];
  const label = (title: string, count: number) => (compact ? `**${title}**` : `### ${title} (${count})`);
  if (summary.failedTests.length > 0) {
    lines.push(
      label("Failed Tests", summary.failedTests.length),
      "",
      ...summary.failedTests.map((test) => `- ${inlineCode(test)}`),
      "",
    );
  }
  if (summary.flakyTests.length > 0) {
    lines.push(
      label("Flaky", summary.flakyTests.length),
      "",
      ...summary.flakyTests.map((test) => `- ${inlineCode(test)}`),
      "",
    );
  }
  if (!compact && summary.testTotals.length > 0) {
    lines.push(`_${summary.testTotals.join(" · ")}_`, "");
  }
  return lines;
}

function logPlaceholder(log: LogState): string | undefined {
  switch (log.status) {
    case "idle":
      return "_Log not loaded. Press ⌘L to load it._";
    case "loading":
      return "_Loading the log…_";
    case "error":
      return `_${log.message}_`;
    case "unavailable":
      return `_${log.reason}_`;
    case "loaded":
      return log.summary.excerpt.length === 0 ? "_Nothing useful found in the log._" : undefined;
  }
}

function runningSteps(job: Job): string {
  return job.steps
    .map((step) => {
      if (step.status === "in_progress") {
        const time = duration(step.startedAt, new Date().toISOString());
        return `◐ **${step.name}**${time ? ` · ${time}` : ""}`;
      }
      if (step.status !== "completed") {
        return `○ ${step.name}`;
      }
      const time = duration(step.startedAt, step.completedAt);
      return `✓ ${step.name}${time ? ` · ${time}` : ""}`;
    })
    .join("  \n");
}

export function buildPreviewMarkdown(input: JobReportInput): string {
  const { check, job, log } = input;
  if (check.state === "pending" && job && job.status !== "completed") {
    const time = duration(job.startedAt, new Date().toISOString());
    const step = currentStep(job);
    const position = step ? ` · step ${step.number} of ${job.steps.length}` : "";
    return [`Running${time ? ` · ${time}` : ""}${position}`, "", runningSteps(job)].join("\n");
  }
  if (check.state !== "failure") {
    const time =
      check.state === "pending"
        ? duration(check.startedAt, new Date().toISOString())
        : duration(check.startedAt, check.completedAt);
    const verb = { pending: "Running", success: "Passed", skipped: "Skipped", neutral: "Finished" }[check.state];
    return `${verb}${time && check.state !== "skipped" ? ` · ${time}` : ""}`;
  }
  if (check.jobId === undefined) {
    return "_This check runs outside GitHub Actions. Open it on GitHub (⌘↵) for details._";
  }
  if (!job) {
    return input.jobError ? `_${input.jobError} Press ⌘R to try again._` : "_Loading the failure…_";
  }
  const lines: string[] = [];
  const errors = failureErrors(input);
  if (errors.length > 0) {
    lines.push("**Errors**", "", ...errors.map(errorLine), "");
  }
  const summary = loadedSummary(log);
  if (summary) {
    lines.push(...testsLines(summary, true));
  }
  const placeholder = logPlaceholder(log);
  if (placeholder) {
    lines.push(placeholder);
  } else if (summary) {
    lines.push(fence(excerptAround(summary, PREVIEW_LOG_LINES)));
  }
  return lines.join("\n");
}

function stepsLines(job: Job): string[] {
  const notable = job.steps.filter(
    (step) => step.status !== "completed" || (step.conclusion !== "success" && step.conclusion !== "skipped"),
  );
  const passed = job.steps.length - notable.length;
  if (job.steps.length === 0) {
    return [];
  }
  const lines = ["### Steps", ""];
  for (const step of notable) {
    const time = duration(step.startedAt, step.completedAt);
    const state = step.status !== "completed" ? "running" : (step.conclusion ?? "").replace(/_/g, " ");
    lines.push(`- ${isFailedStep(step) ? `**${step.name}**` : step.name} · ${state}${time ? ` · ${time}` : ""}`);
  }
  if (passed > 0) {
    lines.push(`- _${passed} other ${passed === 1 ? "step" : "steps"} passed or skipped_`);
  }
  return lines;
}

export function buildJobMarkdown(input: JobReportInput): string {
  const { job, log } = input;
  if (!job && input.jobError) {
    return `_${input.jobError} Press ⌘R to try again._`;
  }
  const summary = loadedSummary(log);
  const lines: string[] = [];
  const errors = failureErrors(input);
  if (errors.length > 0) {
    lines.push("### Errors", "", ...errors.map(errorLine), "");
  }
  if (summary) {
    lines.push(...testsLines(summary, false));
  }
  const stepName = failingStepName(job, summary);
  lines.push(`### Log${stepName ? ` · ${inlineCode(stepName)}` : ""}`, "");
  const placeholder = logPlaceholder(log);
  lines.push(placeholder ?? fence(summary?.excerpt ?? []), "");
  if (job) {
    lines.push(...stepsLines(job));
  }
  return lines.join("\n");
}

export function buildCopyText(input: JobReportInput): string {
  const { check, pr, job, log } = input;
  const summary = loadedSummary(log);
  const lines = [
    `${check.name} ${check.state === "failure" ? "failed" : `is ${check.state}`}${pr ? ` on PR #${pr.number} (${pr.title})` : ""}`,
  ];
  if (pr) {
    lines.push(`PR: ${pr.url}`);
  }
  const url = failureUrl(job, log, check.url);
  if (url) {
    lines.push(`${job ? "Failure" : "Check"}: ${url}`);
  }
  const errors = keyErrors(input);
  if (errors.length > 0) {
    lines.push("", "Errors:", ...errors.map((error) => `- ${error}`));
  }
  if (summary?.failedTests.length) {
    lines.push("", "Failed tests:", ...summary.failedTests.map((test) => `- ${test}`));
  }
  if (summary?.flakyTests.length) {
    lines.push("", "Flaky tests:", ...summary.flakyTests.map((test) => `- ${test}`));
  }
  if (summary?.testTotals.length) {
    lines.push("", `Totals: ${summary.testTotals.join(" · ")}`);
  }
  if (summary?.excerpt.length) {
    const stepName = failingStepName(job, summary);
    lines.push("", `Log excerpt${stepName ? ` (${stepName})` : ""}:`, fence(summary.excerpt));
  }
  return lines.join("\n");
}
