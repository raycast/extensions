// Level 4: task instances of one run, sectioned by state. Mapped tasks collapse to one row.
// Drill in -> log / mapped instances / XCom links. Drill out -> runs, DAG list.

import { hotkey } from "../lib/shortcut";
import { SaveQuicklinkAction } from "./quicklink";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { LINK_XCOM_KEYS, cloudRunExecutionFromXCom, parseReprDict } from "../lib/airflow";
import { matches, parseSearch } from "../lib/filter";
import { codeBlock, formatDuration, relativeTime } from "../lib/format";
import { clientFor, errorText, stateIcon } from "../lib/raycast";
import { ComposerEnvironment, TaskInstance } from "../lib/types";
import { DagList } from "./dag-list";
import { DagRuns } from "./dag-runs";
import {
  EnvironmentActions,
  FilterSubmenu,
  LoadErrorView,
  NavigateSection,
  crumbs,
  refreshShortcut,
} from "./env-actions";
import { TaskLog } from "./task-log";
import { TaskHistoryFor } from "./dag-tasks";

const STATE_ORDER = [
  "failed",
  "upstream_failed",
  "up_for_retry",
  "running",
  "restarting",
  "deferred",
  "queued",
  "scheduled",
  "up_for_reschedule",
  "success",
  "skipped",
  "removed",
  "none",
];
const FAILED = new Set(["failed", "upstream_failed", "up_for_retry"]);

function stateKey(s: TaskInstance["state"]): string {
  return s ?? "none";
}

interface Row {
  taskId: string;
  ti: TaskInstance; // representative instance (worst state for mapped)
  mapped?: TaskInstance[];
}

function worst(tis: TaskInstance[]): TaskInstance {
  return [...tis].sort((a, b) => STATE_ORDER.indexOf(stateKey(a.state)) - STATE_ORDER.indexOf(stateKey(b.state)))[0];
}

function countsText(tis: TaskInstance[]): string {
  const c = new Map<string, number>();
  tis.forEach((t) => c.set(stateKey(t.state), (c.get(stateKey(t.state)) ?? 0) + 1));
  return [...c.entries()]
    .sort((a, b) => STATE_ORDER.indexOf(a[0]) - STATE_ORDER.indexOf(b[0]))
    .map(([s, n]) => `${n} ${s}`)
    .join(" · ");
}

export function TaskInstances(props: {
  env: ComposerEnvironment;
  dagId: string;
  runId: string;
  initialFilter?: "all" | "failed";
}) {
  const { env, dagId, runId } = props;
  const [filter, setFilter] = useState<string>(props.initialFilter ?? "all");
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate, error } = useCachedPromise(
    (uri: string, d: string, r: string) => clientFor({ airflowUri: uri }).listTaskInstances(d, r),
    [env.airflowUri, dagId, runId],
    { keepPreviousData: true },
  );
  const { data: run } = useCachedPromise(
    (uri: string, d: string, r: string) => clientFor({ airflowUri: uri }).getDagRun(d, r),
    [env.airflowUri, dagId, runId],
  );

  const tis = data ?? [];
  const byTask = new Map<string, TaskInstance[]>();
  tis.forEach((t) => byTask.set(t.task_id, [...(byTask.get(t.task_id) ?? []), t]));
  const rows: Row[] = [...byTask.entries()].map(([taskId, list]) =>
    list.length === 1 && list[0].map_index < 0 ? { taskId, ti: list[0] } : { taskId, ti: worst(list), mapped: list },
  );

  const parsed = parseSearch(searchText);
  const visible = rows.filter((r) => {
    const states = (r.mapped ?? [r.ti]).map((t) => stateKey(t.state));
    if (filter === "failed" && !states.some((s) => FAILED.has(s))) return false;
    if (filter !== "all" && filter !== "failed" && !states.includes(filter)) return false;
    return matches(parsed, { task: [r.taskId], op: [r.ti.operator], is: states.concat(r.mapped ? ["mapped"] : []) }, [
      r.taskId,
      r.ti.operator,
      r.ti.task_display_name,
    ]);
  });

  const sections = new Map<string, Row[]>();
  visible.forEach((r) => sections.set(stateKey(r.ti.state), [...(sections.get(stateKey(r.ti.state)) ?? []), r]));
  const ordered = [...sections.entries()].sort((a, b) => STATE_ORDER.indexOf(a[0]) - STATE_ORDER.indexOf(b[0]));

  const failedCount = tis.filter((t) => FAILED.has(stateKey(t.state))).length;
  const greenButFailed = run?.state === "success" && failedCount > 0;
  const presentStates = STATE_ORDER.filter((s) => tis.some((t) => stateKey(t.state) === s));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={crumbs(dagId, run?.state ?? undefined, `${tis.length} tasks`)}
      searchBarPlaceholder="Filter tasks…  task:dbt  op:Bash  is:mapped"
      searchBarAccessory={
        <List.Dropdown tooltip="Task State" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title={`All Tasks (${tis.length})`} value="all" icon={Icon.List} />
          <List.Dropdown.Item
            title={`Failed / Upstream / Retry (${failedCount})`}
            value="failed"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          />
          <List.Dropdown.Section title="By State">
            {presentStates.map((s) => (
              <List.Dropdown.Item key={s} title={s} value={s} icon={stateIcon(s)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && <List.EmptyView icon={Icon.Warning} title="Could not load tasks" description={errorText(error)} />}
      {greenButFailed && (
        <List.Section title="Warning">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={`Run is green but ${failedCount} task instance(s) failed`}
            subtitle="Leaf task is likely all_done; check the failed tasks, not the run state"
            actions={
              <ActionPanel>
                <Action title="Show Failed Tasks" icon={Icon.XMarkCircle} onAction={() => setFilter("failed")} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {ordered.map(([state, list]) => (
        <List.Section key={state} title={state} subtitle={`${list.length}`}>
          {list.map((r) => (
            <TaskRow
              key={r.taskId}
              env={env}
              row={r}
              searchText={searchText}
              setSearchText={setSearchText}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TaskRow(props: {
  env: ComposerEnvironment;
  row: Row;
  searchText: string;
  setSearchText: (s: string) => void;
  revalidate: () => void;
}) {
  const { env, row } = props;
  const { ti } = row;
  const accessories: List.Item.Accessory[] = [];
  if (row.mapped)
    accessories.push({
      tag: { value: `${row.mapped.length} mapped`, color: Color.Purple },
      tooltip: countsText(row.mapped),
    });
  else {
    if (ti.try_number > 1)
      accessories.push({ tag: { value: `try ${ti.try_number}/${ti.max_tries + 1}`, color: Color.Orange } });
    accessories.push({ text: formatDuration(ti.duration), icon: Icon.Stopwatch });
    accessories.push({ text: relativeTime(ti.start_date ?? ti.queued_when), tooltip: ti.hostname });
  }
  return (
    <List.Item
      icon={stateIcon(ti.state)}
      title={row.taskId}
      subtitle={row.mapped ? countsText(row.mapped) : (ti.operator ?? undefined)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Drill In">
            {row.mapped && row.mapped.length === 1 && (
              <Action.Push title="Show Log" icon={Icon.Terminal} target={<TaskLog env={env} ti={ti} />} />
            )}
            {row.mapped ? (
              <Action.Push
                title="Show Mapped Instances"
                icon={Icon.List}
                target={<MappedTaskInstances env={env} dagId={ti.dag_id} runId={ti.dag_run_id} taskId={row.taskId} />}
              />
            ) : (
              <Action.Push title="Show Log" icon={Icon.Terminal} target={<TaskLog env={env} ti={ti} />} />
            )}
            {row.mapped && row.mapped.length > 1 && (
              <Action.Push
                title="Show Log of Worst Instance"
                icon={Icon.Terminal}
                shortcut={hotkey(["cmd"], "l")}
                target={<TaskLog env={env} ti={ti} />}
              />
            )}
            {!row.mapped && <TryLogsSubmenu env={env} ti={ti} />}
            <Action.Push
              title="XCom & Links"
              icon={Icon.Link}
              shortcut={hotkey(["cmd", "shift"], "x")}
              target={<TaskLinks env={env} ti={ti} />}
            />
            <Action.Push
              title="Task History (Last 50 Runs)"
              icon={Icon.BarChart}
              shortcut={hotkey(["cmd"], "h")}
              target={<TaskHistoryFor env={env} dagId={ti.dag_id} taskId={row.taskId} />}
            />
            <Action.OpenInBrowser
              title="Open Task in Airflow"
              url={clientFor(env).uiTaskUrl(
                ti.dag_id,
                ti.dag_run_id,
                ti.task_id,
                row.mapped ? undefined : ti.map_index,
              )}
              shortcut={hotkey(["cmd"], "o")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Filter">
            <FilterSubmenu
              searchText={props.searchText}
              setSearchText={props.setSearchText}
              options={[
                { key: "is", value: "mapped", title: "Mapped Tasks Only" },
                ...(ti.operator ? [{ key: "op" as const, value: ti.operator, title: `Operator: ${ti.operator}` }] : []),
                {
                  key: "task",
                  value: row.taskId.split("_").slice(0, 2).join("_"),
                  title: `Task Prefix: ${row.taskId.split("_").slice(0, 2).join("_")}`,
                },
              ]}
            />
          </ActionPanel.Section>
          <NavigateSection upTitle="Runs">
            <Action.Push
              title={`All Runs of ${ti.dag_id}`}
              icon={Icon.ArrowsExpand}
              shortcut={hotkey(["cmd", "shift"], "w")}
              target={<DagRuns env={env} dagId={ti.dag_id} />}
            />
            <Action.Push
              title={`All DAGs in ${env.id}`}
              icon={Icon.Globe}
              shortcut={hotkey(["cmd", "shift"], "g")}
              target={<DagList env={env} />}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={props.revalidate} />
          </NavigateSection>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Task ID"
              content={ti.task_id}
              shortcut={hotkey(["cmd", "shift"], "c")}
            />
            <Action.CopyToClipboard title="Copy Run ID" content={ti.dag_run_id} />
            <SaveQuicklinkAction
              context={{
                project: env.project,
                env: env.name,
                dag: ti.dag_id,
                run: ti.dag_run_id,
                task: ti.task_id,
                ...(ti.map_index >= 0 ? { map: ti.map_index } : {}),
              }}
              name={`Airflow log · ${ti.dag_id}.${ti.task_id}`}
            />
          </ActionPanel.Section>
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}

function TryLogsSubmenu(props: { env: ComposerEnvironment; ti: TaskInstance }) {
  const { env, ti } = props;
  if (ti.try_number <= 1) return null;
  return (
    <ActionPanel.Submenu title="Log for Try…" icon={Icon.RotateClockwise} shortcut={hotkey(["cmd"], "t")}>
      {Array.from({ length: ti.try_number }, (_, i) => i + 1).map((n) => (
        <Action.Push key={n} title={`Try ${n}`} target={<TaskLog env={env} ti={ti} tryNumber={n} />} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function MappedTaskInstances(props: { env: ComposerEnvironment; dagId: string; runId: string; taskId: string }) {
  const { env, dagId, runId, taskId } = props;
  const [filter, setFilter] = useState("all");
  const { data, isLoading, revalidate, error } = useCachedPromise(
    (uri: string, d: string, r: string, t: string) => clientFor({ airflowUri: uri }).listMappedTaskInstances(d, r, t),
    [env.airflowUri, dagId, runId, taskId],
    { keepPreviousData: true },
  );
  const tis = (data ?? []).filter(
    (t) => filter === "all" || (filter === "failed" ? FAILED.has(stateKey(t.state)) : stateKey(t.state) === filter),
  );
  const states = STATE_ORDER.filter((s) => (data ?? []).some((t) => stateKey(t.state) === s));
  return (
    <List
      isLoading={isLoading}
      navigationTitle={crumbs(dagId, taskId, `${data?.length ?? 0} mapped`)}
      searchBarPlaceholder="Filter by map index or field…"
      searchBarAccessory={
        <List.Dropdown tooltip="State" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Failed / Upstream / Retry" value="failed" />
          {states.map((s) => (
            <List.Dropdown.Item key={s} title={s} value={s} icon={stateIcon(s)} />
          ))}
        </List.Dropdown>
      }
    >
      {error && <LoadErrorView title="Could Not Load Mapped Tasks" error={error} onRetry={revalidate} />}
      {tis.map((ti) => {
        const hint = Object.values(ti.rendered_fields ?? {}).find((v) => typeof v === "string" && v.length < 80) as
          string | undefined;
        return (
          <List.Item
            key={ti.map_index}
            icon={stateIcon(ti.state)}
            title={`[${ti.map_index}] ${taskId}`}
            subtitle={hint}
            keywords={[String(ti.map_index), stateKey(ti.state)]}
            accessories={[
              ...(ti.try_number > 1 ? [{ tag: { value: `try ${ti.try_number}`, color: Color.Orange } }] : []),
              { text: formatDuration(ti.duration), icon: Icon.Stopwatch },
              { text: relativeTime(ti.start_date) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Log" icon={Icon.Terminal} target={<TaskLog env={env} ti={ti} />} />
                <TryLogsSubmenu env={env} ti={ti} />
                <Action.Push
                  title="XCom & Links"
                  icon={Icon.Link}
                  shortcut={hotkey(["cmd", "shift"], "x")}
                  target={<TaskLinks env={env} ti={ti} />}
                />
                <Action.OpenInBrowser
                  title="Open in Airflow"
                  url={clientFor(env).uiTaskUrl(dagId, runId, taskId, ti.map_index)}
                  shortcut={hotkey(["cmd"], "o")}
                />
                <NavigateSection upTitle="Tasks">
                  <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
                </NavigateSection>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/** XCom keys for one task instance, with Cloud Run execution / log links where present. */
export function TaskLinks(props: { env: ComposerEnvironment; ti: TaskInstance }) {
  const { env, ti } = props;
  const { data, isLoading, error } = useCachedPromise(
    async (uri: string, d: string, r: string, t: string, m: number) => {
      const c = clientFor({ airflowUri: uri });
      const keys = await c.listXComKeys(d, r, t, { mapIndex: m });
      return Promise.all(
        keys.map(async (k) => {
          try {
            return { key: k.key, value: (await c.getXCom(d, r, t, k.key, { mapIndex: m })).value };
          } catch (e) {
            return { key: k.key, value: undefined, error: errorText(e) };
          }
        }),
      );
    },
    [env.airflowUri, ti.dag_id, ti.dag_run_id, ti.task_id, ti.map_index],
  );
  const entries = [...(data ?? [])].sort(
    (a, b) => Number(!LINK_XCOM_KEYS.includes(a.key)) - Number(!LINK_XCOM_KEYS.includes(b.key)),
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={crumbs(ti.task_id, ti.map_index >= 0 ? `[${ti.map_index}]` : undefined, "XCom")}
      searchBarPlaceholder="Filter XCom keys…"
    >
      {error && <List.EmptyView icon={Icon.Warning} title="Could not load XCom" description={errorText(error)} />}
      {!isLoading && !error && entries.length === 0 && <List.EmptyView title="No XCom entries" />}
      {entries.map((x) => {
        const str = typeof x.value === "string" ? x.value : (JSON.stringify(x.value, null, 2) ?? "");
        const cr =
          x.key === "cloud_run_job_logging_link" ? cloudRunExecutionFromXCom(x.value, env.location) : undefined;
        const candidate = /^https?:\/\//i.test(str.trim()) ? str.trim() : parseReprDict(x.value).url?.trim();
        // Only http(s): XCom is DAG-controlled, so never hand other URL schemes to the system opener.
        const url = candidate && /^https?:\/\//i.test(candidate) ? candidate : undefined;
        return (
          <List.Item
            key={x.key}
            icon={cr || url ? { source: Icon.Link, tintColor: Color.Blue } : Icon.Document}
            title={x.key}
            detail={
              <List.Item.Detail
                markdown={x.error ? `> ⚠️ ${x.error}` : codeBlock(str.slice(0, 20000))}
                metadata={
                  cr && (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Project" text={cr.projectId} />
                      <List.Item.Detail.Metadata.Label title="Region" text={cr.region} />
                      {cr.jobName && <List.Item.Detail.Metadata.Label title="Job" text={cr.jobName} />}
                      <List.Item.Detail.Metadata.Label title="Execution" text={cr.executionName} />
                      <List.Item.Detail.Metadata.Link title="Cloud Run" target={cr.consoleUrl} text="Open execution" />
                      <List.Item.Detail.Metadata.Link title="Logs" target={cr.logsUrl} text="Open in Logs Explorer" />
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            }
            actions={
              <ActionPanel>
                {cr && <Action.OpenInBrowser title="Open Cloud Run Logs" url={cr.logsUrl} />}
                {cr && <Action.OpenInBrowser title="Open Cloud Run Execution" url={cr.consoleUrl} />}
                {url && <Action.OpenInBrowser title="Open URL" url={url} />}
                <Action.CopyToClipboard title="Copy Value" content={str} />
                {cr && (
                  <Action.CopyToClipboard
                    title="Copy Gcloud Logging Command"
                    content={`gcloud logging read 'resource.type="cloud_run_job" labels."run.googleapis.com/execution_name"="${cr.executionName}"' --project ${cr.projectId} --limit 200 --format='value(textPayload)'`}
                  />
                )}
                <Action.OpenInBrowser
                  title="Open Task in Airflow"
                  url={clientFor(env).uiTaskUrl(ti.dag_id, ti.dag_run_id, ti.task_id, ti.map_index)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
