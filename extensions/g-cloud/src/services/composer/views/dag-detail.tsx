// DAG metadata + source. Reached from the DAG list (⌘I) or from the runs list.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { codeBlock, formatTimestamp, relativeTime } from "../lib/format";
import { clientFor, errorText, tierColor, tierLabel } from "../lib/raycast";
import { ComposerEnvironment, Dag } from "../lib/types";
import { DagRuns } from "./dag-runs";
import { DagPerformance } from "./dag-performance";
import { DagLineage } from "./lineage";
import { expressionLines } from "../lib/lineage";
import { EnvironmentActions, crumbs } from "./env-actions";

const SOURCE_MAX_LINES = 1500;

function timetableText(t: unknown): string | undefined {
  if (!t) return undefined;
  if (typeof t === "string") return t;
  const o = t as { __type?: string; value?: string };
  return o.value ? `${o.value}${o.__type ? ` (${o.__type})` : ""}` : JSON.stringify(t);
}

export function DagDetail(props: { env: ComposerEnvironment; dagId: string }) {
  const { env, dagId } = props;
  const client = clientFor(env);
  const {
    data: d,
    isLoading,
    error,
  } = useCachedPromise(
    (uri: string, id: string) => clientFor({ airflowUri: uri }).getDagDetails(id),
    [env.airflowUri, dagId],
  );
  const timetable = timetableText(d?.timetable_summary ?? d?.schedule_interval);
  const isDataset = /dataset/i.test(`${timetable ?? ""} ${d?.timetable_description ?? ""}`);

  const md = [
    `# ${dagId}`,
    error ? `> ⚠️ ${errorText(error)}` : "",
    d?.description ? `_${d.description}_` : "",
    isDataset
      ? "> **Dataset-triggered:** this DAG fires when its upstream datasets update, not on a cron. Trigger manually to exercise it."
      : "",
    d?.dataset_expression
      ? `## Waits On (datasets)\n\n${codeBlock(expressionLines(d.dataset_expression).join("\n"))}`
      : "",
    d?.doc_md ? `## Docs\n\n${d.doc_md.slice(0, 8000)}` : "",
    d?.params && Object.keys(d.params).length
      ? `## Params\n\n${codeBlock(JSON.stringify(d.params, null, 2), "json")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={crumbs(env.id, dagId)}
      markdown={md}
      metadata={
        d && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Environment">
              <Detail.Metadata.TagList.Item text={env.id} color={tierColor(env)} />
              <Detail.Metadata.TagList.Item text={tierLabel(env)} color={tierColor(env)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={d.is_paused ? "paused" : "active"}
                color={d.is_paused ? Color.SecondaryText : Color.Green}
              />
              {d.has_import_errors ? <Detail.Metadata.TagList.Item text="import error" color={Color.Red} /> : null}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Schedule" text={d.timetable_description ?? timetable ?? "-"} />
            {timetable && <Detail.Metadata.Label title="Timetable" text={timetable} />}
            <Detail.Metadata.Label title="Next Run" text={formatTimestamp(d.next_dagrun)} />
            <Detail.Metadata.Label title="Catchup" text={String(d.catchup ?? "-")} />
            <Detail.Metadata.Label title="Max Active Runs" text={String(d.max_active_runs ?? "-")} />
            <Detail.Metadata.Label title="Max Active Tasks" text={String(d.max_active_tasks ?? "-")} />
            <Detail.Metadata.Label title="Start Date" text={formatTimestamp(d.start_date)} />
            <Detail.Metadata.Label title="Last Parsed" text={relativeTime(d.last_parsed ?? d.last_parsed_time)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Owners" text={d.owners.join(", ") || "-"} />
            {(d.tags ?? []).length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {(d.tags ?? []).map((t) => (
                  <Detail.Metadata.TagList.Item key={t.name} text={t.name} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label title="File" text={d.fileloc} />
            <Detail.Metadata.Link title="Airflow" target={client.uiDagUrl(dagId)} text="Open grid" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={dagId} />} />
          <Action.Push
            title="Performance"
            icon={Icon.BarChart}
            shortcut={hotkey(["cmd", "shift"], "p")}
            target={<DagPerformance env={env} dagId={dagId} />}
          />
          <Action.Push
            title="Dataset Lineage"
            icon={Icon.Network}
            shortcut={hotkey(["cmd"], "l")}
            target={<DagLineage env={env} dagId={dagId} />}
          />
          {d && (
            <Action.Push
              title="View Source"
              icon={Icon.Code}
              shortcut={hotkey(["cmd"], "s")}
              target={<DagSource env={env} dag={d} />}
            />
          )}
          <Action.OpenInBrowser
            title="Open DAG in Airflow"
            url={client.uiDagUrl(dagId)}
            shortcut={hotkey(["cmd"], "o")}
          />
          <Action.CopyToClipboard title="Copy DAG ID" content={dagId} shortcut={hotkey(["cmd", "shift"], "c")} />
          {d && <Action.CopyToClipboard title="Copy File Location" content={d.fileloc} />}
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}

function DagSource(props: { env: ComposerEnvironment; dag: Dag }) {
  const { env, dag } = props;
  const fileToken = (dag as Dag & { file_token?: string }).file_token;
  const { data, isLoading, error } = useCachedPromise(
    async (uri: string, token: string) => (token ? clientFor({ airflowUri: uri }).getDagSource(token) : ""),
    [env.airflowUri, fileToken ?? ""],
  );
  const lines = (data ?? "").split("\n");
  const truncated = lines.length > SOURCE_MAX_LINES;
  const body = truncated ? lines.slice(0, SOURCE_MAX_LINES).join("\n") : (data ?? "");
  const md = error
    ? `> ⚠️ ${errorText(error)}`
    : !fileToken
      ? "> No file_token on this DAG; source unavailable."
      : `**${dag.fileloc}**${truncated ? ` — first ${SOURCE_MAX_LINES} of ${lines.length} lines` : ""}\n\n${codeBlock(
          body,
          "python",
        )}`;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={crumbs(env.id, dag.dag_id, "source")}
      markdown={md}
      actions={
        <ActionPanel>
          {data && <Action.CopyToClipboard title="Copy Source" content={data} />}
          <Action.CopyToClipboard title="Copy File Location" content={dag.fileloc} />
        </ActionPanel>
      }
    />
  );
}
