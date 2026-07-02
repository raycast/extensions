import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import useInterval from "use-interval";
import { getCIRefreshInterval, getGitLabGQL, gitlab } from "../common";
import { getErrorMessage, getIdFromGqlId, showErrorToast } from "../utils";
import { Job } from "./jobs";

const MAX_LOG_CHARS = 100_000;
const MIN_LOG_REFRESH_MS = 5000;

const TERMINAL_STATUSES = new Set(["success", "failed", "canceled", "skipped", "manual"]);
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const ANSI_REGEX = new RegExp(
  [
    `${ESC}\\[[0-9;?]*[A-Za-z]`, // CSI: ESC [ ... <letter>
    `${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`, // OSC: ESC ] ... BEL or ST
  ].join("|"),
  "g",
);

function isTerminal(status: string | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

function buildMarkdown(trace: string, status: string): string {
  if (trace.length === 0) {
    if (!status || ["created", "manual", "scheduled"].includes(status.toLowerCase())) {
      return "_Job has not started yet._";
    }
    return "_No log output yet._";
  }
  const cleaned = stripAnsi(trace);
  const truncated = cleaned.length > MAX_LOG_CHARS;
  const tail = truncated ? cleaned.slice(-MAX_LOG_CHARS) : cleaned;
  const header = truncated
    ? `> Log truncated to last ${Math.round(MAX_LOG_CHARS / 1024)} KB. Open in browser for the full trace.\n\n`
    : "";
  return `${header}\`\`\`\n${tail}\n\`\`\``;
}

export function JobLogView(props: { job: Job; projectFullPath: string }) {
  const numericJobId = useRef<number>(getIdFromGqlId(props.job.id));
  const [trace, setTrace] = useState<string>("");
  const [status, setStatus] = useState<string>(props.job.status);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function load() {
    try {
      const text = await gitlab.getJobTrace(props.job.projectId, numericJobId.current);
      setTrace(text);
    } catch (e) {
      showErrorToast(getErrorMessage(e), "Failed to load job log");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshStatusAndTrace() {
    try {
      const data = await gitlab.fetch(`projects/${props.job.projectId}/jobs/${numericJobId.current}`);
      if (data && typeof data.status === "string") {
        setStatus(data.status);
      }
    } catch {
      // status fetch failure is non-fatal — keep polling the trace
    }
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  const intervalMs = isTerminal(status)
    ? null
    : Math.max(MIN_LOG_REFRESH_MS, getCIRefreshInterval() ?? MIN_LOG_REFRESH_MS);
  useInterval(() => {
    refreshStatusAndTrace();
  }, intervalMs);

  const browserUrl = getGitLabGQL().urlJoin(`${props.projectFullPath}/-/jobs/${numericJobId.current}`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Log · ${props.job.name}`}
      markdown={buildMarkdown(trace, status)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={browserUrl} />
          <Action.CopyToClipboard
            title="Copy Log to Clipboard"
            content={stripAnsi(trace)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Refresh"
            icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshStatusAndTrace}
          />
        </ActionPanel>
      }
    />
  );
}
