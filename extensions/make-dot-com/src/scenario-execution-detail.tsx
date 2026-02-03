import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import type { MakeClient } from "./make-api";
import { presentMakeApiError } from "./make-api";
import { toScenarioExecutionLogUrl } from "./make-browser-url";
import type {
  GetScenarioExecutionDetailsResponse,
  GetScenarioLogResponse,
  ScenarioLog,
} from "./types";

type Props = {
  client: MakeClient;
  baseUrl: string;
  teamId: number;
  scenarioId: number;
  executionId: string;
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function statusLabel(status?: number): string {
  if (status === 1) return "Success";
  if (status === 2) return "Warning";
  if (status === 3) return "Error";
  return "—";
}

function fmtDurationMs(ms?: number): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function safeJsonBlock(
  value: unknown,
  maxChars = 30_000,
): {
  text: string;
  truncated: boolean;
} {
  try {
    const raw = JSON.stringify(value, null, 2) ?? "";
    if (raw.length <= maxChars) return { text: raw, truncated: false };
    return { text: raw.slice(0, maxChars) + "\n…", truncated: true };
  } catch (e) {
    return {
      text: `<<failed to stringify>>\n${e instanceof Error ? e.message : String(e)}`,
      truncated: false,
    };
  }
}

function summarizeLog(log: ScenarioLog | null): string[] {
  if (!log) return ["- —"];

  const lines: string[] = [];
  lines.push(`- Status: **${statusLabel(log.status)}**`);
  if (log.timestamp) lines.push(`- Timestamp: ${fmtDate(log.timestamp)}`);
  if (log.duration !== undefined)
    lines.push(`- Duration: ${fmtDurationMs(log.duration)}`);
  if (log.operations !== undefined)
    lines.push(`- Operations: ${log.operations}`);
  if (log.transfer !== undefined) lines.push(`- Transfer: ${log.transfer}`);
  if (log.imtId) lines.push(`- imtId: \`${log.imtId}\``);
  if (log.type) lines.push(`- Type: \`${log.type}\``);
  if (log.teamId !== undefined) lines.push(`- Team ID: \`${log.teamId}\``);
  if (log.organizationId !== undefined)
    lines.push(`- Org ID: \`${log.organizationId}\``);

  return lines.length ? lines : ["- —"];
}

export function ScenarioExecutionDetail(props: Props) {
  const prefs = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [scenarioLog, setScenarioLog] = useState<ScenarioLog | null>(null);
  const [execution, setExecution] =
    useState<GetScenarioExecutionDetailsResponse | null>(null);

  const url = useMemo(
    () =>
      toScenarioExecutionLogUrl({
        baseUrl: props.baseUrl,
        teamId: props.teamId,
        scenarioId: props.scenarioId,
        executionId: props.executionId,
      }),
    [props.baseUrl, props.teamId, props.scenarioId, props.executionId],
  );

  async function refresh() {
    setIsLoading(true);
    try {
      const [logRes, execRes] = await Promise.all([
        props.client.getJson<GetScenarioLogResponse>(
          `/api/v2/scenarios/${props.scenarioId}/logs/${props.executionId}`,
        ),
        props.client.getJson<GetScenarioExecutionDetailsResponse>(
          `/api/v2/scenarios/${props.scenarioId}/executions/${props.executionId}`,
        ),
      ]);

      setScenarioLog(logRes?.scenarioLog ?? null);
      setExecution(execRes ?? null);
    } catch (e) {
      await presentMakeApiError(e, "Failed to load execution details");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [props.scenarioId, props.executionId]);

  const outputs =
    execution?.outputs === undefined || execution?.outputs === null
      ? null
      : execution.outputs;
  const error =
    execution?.error === undefined || execution?.error === null
      ? null
      : execution.error;

  const outputsBlock = outputs ? safeJsonBlock(outputs) : null;
  const errorBlock = error ? safeJsonBlock(error) : null;

  async function confirmAndCopy(opts: { title: string; content: string }) {
    const ok = await confirmAlert({
      title: "Copy potentially sensitive data?",
      message:
        "This may include secrets or PII from Make execution payloads. Only paste it somewhere you trust.",
      primaryAction: { title: "Copy" },
    });
    if (!ok) return;
    await Clipboard.copy(opts.content);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: opts.title,
    });
  }

  const markdown = [
    `## Execution ${props.executionId}`,
    ``,
    `### Summary (Scenario Log)`,
    ...summarizeLog(scenarioLog),
    ``,
    `### Execution Details`,
    `- Status: **${execution?.status ?? "—"}**`,
    ...(!prefs.allowCopyExecutionPayloads
      ? [
          ``,
          `> Note: Execution payloads are hidden by default. Enable “Allow Execution Payload Copy” in preferences to view/copy outputs and error JSON.`,
        ]
      : []),
    ...(prefs.allowCopyExecutionPayloads && errorBlock
      ? [
          ``,
          `### Error`,
          "```json",
          errorBlock.text,
          "```",
          errorBlock.truncated ? `\n> Note: error JSON truncated\n` : "",
        ]
      : []),
    ...(prefs.allowCopyExecutionPayloads && outputsBlock
      ? [
          ``,
          `### Outputs`,
          "```json",
          outputsBlock.text,
          "```",
          outputsBlock.truncated ? `\n> Note: outputs JSON truncated\n` : "",
        ]
      : []),
  ]
    .filter((line) => line !== "")
    .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Scenario"
            text={`${props.scenarioId}`}
          />
          <Detail.Metadata.Label title="Execution" text={props.executionId} />
          <Detail.Metadata.Label
            title="Log Status"
            text={statusLabel(scenarioLog?.status)}
          />
          <Detail.Metadata.Label
            title="Execution Status"
            text={execution?.status ?? "—"}
          />
          <Detail.Metadata.Label
            title="Timestamp"
            text={scenarioLog?.timestamp ? fmtDate(scenarioLog.timestamp) : "—"}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={fmtDurationMs(scenarioLog?.duration)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Make.com"
            url={url}
            icon={Icon.Globe}
          />

          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={url} />
            {prefs.allowCopyExecutionPayloads && outputsBlock ? (
              <Action
                title="Copy Outputs JSON"
                onAction={() =>
                  void confirmAndCopy({
                    title: "Outputs JSON",
                    content: outputsBlock.text,
                  })
                }
              />
            ) : null}
            {prefs.allowCopyExecutionPayloads && errorBlock ? (
              <Action
                title="Copy Error JSON"
                onAction={() =>
                  void confirmAndCopy({
                    title: "Error JSON",
                    content: errorBlock.text,
                  })
                }
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => void refresh()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
