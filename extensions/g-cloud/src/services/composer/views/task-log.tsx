// Level 5: one task instance's log. Tail-truncated (large markdown hangs Raycast), try switcher,
// errors-only mode, copy full log, Airflow + Cloud Logging deep links.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { errorLines, tailLines } from "../lib/airflow";
import { codeBlock, formatDuration, formatTimestamp } from "../lib/format";
import { clientFor, errorText, LOG_TAIL_LINES, stateColor, tierColor } from "../lib/raycast";
import { ComposerEnvironment, TaskInstance } from "../lib/types";
import { FULL_LINES, capChars, cloudLoggingUrl, errorsWithContext } from "../lib/log";
import { EnvironmentActions, crumbs, refreshShortcut } from "./env-actions";
import { TaskLinks } from "./task-instances";

export function TaskLog(props: { env: ComposerEnvironment; ti: TaskInstance; tryNumber?: number }) {
  const { env, ti } = props;
  const maxTry = Math.max(1, ti.try_number);
  const [tryNumber, setTryNumber] = useState(Math.min(Math.max(1, props.tryNumber ?? maxTry), maxTry));
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [full, setFull] = useState(false);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (uri: string, d: string, r: string, t: string, n: number, m: number) =>
      clientFor({ airflowUri: uri }).getTaskLog(d, r, t, n, { mapIndex: m }),
    [env.airflowUri, ti.dag_id, ti.dag_run_id, ti.task_id, tryNumber, ti.map_index],
    { keepPreviousData: false },
  );

  const content = data?.content ?? "";
  const totalLines = content ? content.split("\n").length : 0;
  const errs = content ? errorLines(content, 30) : [];
  const dur = ti.duration;
  const header = [
    `**${ti.task_id}**${ti.map_index >= 0 ? ` [${ti.map_index}]` : ""}`,
    `state \`${ti.state ?? "none"}\``,
    `try ${tryNumber} of ${maxTry}`,
    `duration ${formatDuration(dur)}`,
    ti.hostname ? `host \`${ti.hostname}\`` : "",
    ti.state === "running" ? "_running — ⌘R to refresh_" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  let body: string;
  if (error) {
    body = `> ⚠️ ${errorText(error)}`;
  } else if (isLoading && !content) {
    body = "_Loading log…_";
  } else if (!content.trim()) {
    body = "_Empty log for this try._";
  } else if (errorsOnly) {
    const e = capChars(errorsWithContext(content));
    body = e.text.trim()
      ? `### Error lines (±2 lines context)\n\n${codeBlock(e.text, "log")}`
      : "_No error-looking lines found. Toggle errors-only off (⌘E)._";
  } else {
    const t = tailLines(content, full ? FULL_LINES : LOG_TAIL_LINES);
    const c = capChars(t.text);
    const omitted = t.dropped > 0 || c.cut;
    const errBlock = errs.length && !full ? `### Errors\n\n${codeBlock(errs.slice(-15).join("\n"), "log")}\n\n` : "";
    body = `${errBlock}### Log${
      omitted ? ` — last part only (${totalLines} lines total; ⌘⇧C copies full log, ⌘F shows more)` : ""
    }\n\n${codeBlock(c.text, "log")}`;
  }

  const client = clientFor(env);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={crumbs(ti.dag_id, ti.task_id, `try ${tryNumber}`)}
      markdown={`${header}\n\n${body}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Environment">
            <Detail.Metadata.TagList.Item text={env.id} color={tierColor(env)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="DAG" text={ti.dag_id} />
          <Detail.Metadata.Label title="Run" text={ti.dag_run_id} />
          <Detail.Metadata.Label title="Task" text={ti.task_id} />
          {ti.operator && <Detail.Metadata.Label title="Operator" text={ti.operator} />}
          <Detail.Metadata.TagList title="State">
            <Detail.Metadata.TagList.Item text={ti.state ?? "none"} color={stateColor(ti.state)} />
            {errs.length > 0 && <Detail.Metadata.TagList.Item text={`${errs.length} error lines`} color={Color.Red} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Try" text={`${tryNumber} / ${maxTry} (max ${ti.max_tries + 1})`} />
          {ti.map_index >= 0 && <Detail.Metadata.Label title="Map Index" text={String(ti.map_index)} />}
          <Detail.Metadata.Label title="Started" text={formatTimestamp(ti.start_date)} />
          <Detail.Metadata.Label title="Ended" text={formatTimestamp(ti.end_date)} />
          <Detail.Metadata.Label title="Duration" text={formatDuration(dur)} />
          {ti.hostname && <Detail.Metadata.Label title="Host" text={ti.hostname} />}
          {ti.pool && <Detail.Metadata.Label title="Pool" text={ti.pool} />}
          {ti.queue && <Detail.Metadata.Label title="Queue" text={ti.queue} />}
          <Detail.Metadata.Label
            title="Log Size"
            text={`${totalLines} lines · ${Math.round(content.length / 1024)} KB`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Airflow"
            target={client.uiTaskUrl(ti.dag_id, ti.dag_run_id, ti.task_id, ti.map_index)}
            text="Open task"
          />
          <Detail.Metadata.Link
            title="Cloud Logging"
            target={cloudLoggingUrl(env, ti, tryNumber)}
            text="Logs Explorer"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Log">
            {content && (
              <Action.CopyToClipboard
                title="Copy Full Log"
                content={content}
                shortcut={hotkey(["cmd", "shift"], "c")}
              />
            )}
            <Action
              title={errorsOnly ? "Show Whole Log" : "Errors Only"}
              icon={Icon.Bug}
              shortcut={hotkey(["cmd"], "e")}
              onAction={() => setErrorsOnly((v) => !v)}
            />
            <Action
              title={full ? "Show Tail Only" : `Show More (${FULL_LINES} Lines)`}
              icon={Icon.Maximize}
              shortcut={hotkey(["cmd"], "f")}
              onAction={() => setFull((v) => !v)}
            />
            {errs.length > 0 && <Action.CopyToClipboard title="Copy Error Lines" content={errs.join("\n")} />}
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
          </ActionPanel.Section>
          {maxTry > 1 && (
            <ActionPanel.Section title="Tries">
              {tryNumber > 1 && (
                <Action
                  title="Previous Try"
                  icon={Icon.ArrowLeft}
                  shortcut={hotkey(["cmd", "shift"], "arrowLeft")}
                  onAction={() => setTryNumber((n) => Math.max(1, n - 1))}
                />
              )}
              {tryNumber < maxTry && (
                <Action
                  title="Next Try"
                  icon={Icon.ArrowRight}
                  shortcut={hotkey(["cmd", "shift"], "arrowRight")}
                  onAction={() => setTryNumber((n) => Math.min(maxTry, n + 1))}
                />
              )}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Task in Airflow"
              url={client.uiTaskUrl(ti.dag_id, ti.dag_run_id, ti.task_id, ti.map_index)}
              shortcut={hotkey(["cmd"], "o")}
            />
            <Action.OpenInBrowser
              title="Open in Cloud Logging"
              url={cloudLoggingUrl(env, ti, tryNumber)}
              shortcut={hotkey(["cmd", "shift"], "l")}
            />
            <Action.Push
              title="XCom & Links"
              icon={Icon.Link}
              shortcut={hotkey(["cmd", "shift"], "x")}
              target={<TaskLinks env={env} ti={ti} />}
            />
          </ActionPanel.Section>
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}
