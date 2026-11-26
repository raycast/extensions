// Level 3: runs of one DAG (server-side state filter, paginated). Drill in -> task instances.
// RunListItem is reused by the cross-DAG failures view.

import { hotkey } from "../lib/shortcut";
import { SaveQuicklinkAction } from "./quicklink";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { matches, parseSearch } from "../lib/filter";
import { durationBetween, formatDuration, formatTimestamp, relativeTime } from "../lib/format";
import { clientFor, stateIcon, tierColor } from "../lib/raycast";
import { ComposerEnvironment, DagRun } from "../lib/types";
import { DagDetail } from "./dag-detail";
import { DagList } from "./dag-list";
import { EnvironmentActions, LoadErrorView, NavigateSection, crumbs, refreshShortcut } from "./env-actions";
import { TaskInstances } from "./task-instances";
import { DagPerformance } from "./dag-performance";
import { RunLineage } from "./datasets";

const PAGE_SIZE = 25;
const STATES = ["failed", "running", "queued", "success"] as const;

export function DagRuns(props: { env: ComposerEnvironment; dagId: string; initialState?: string; root?: boolean }) {
  const { env, dagId } = props;
  const [state, setState] = useState<string>(props.initialState ?? "all");
  const [searchText, setSearchText] = useState("");
  const [total, setTotal] = useState<number>();

  const { data, isLoading, pagination, revalidate, error } = useCachedPromise(
    (uri: string, id: string, st: string) =>
      async ({ page }: { page: number }) => {
        const res = await clientFor({ airflowUri: uri }).listDagRuns(id, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          states: st === "all" ? undefined : [st],
          orderBy: "-execution_date",
        });
        setTotal(res.total);
        return { data: res.runs, hasMore: (page + 1) * PAGE_SIZE < res.total };
      },
    [env.airflowUri, dagId, state],
    { keepPreviousData: true },
  );

  const parsed = parseSearch(searchText);
  const runs = (data ?? []).filter((r) =>
    matches(parsed, { run: [r.dag_run_id], type: [r.run_type], is: [r.state] }, [
      r.dag_run_id,
      r.run_type,
      r.note,
      r.state,
    ]),
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={
        props.root ? undefined : crumbs(env.id, dagId, total !== undefined ? `${total} runs` : undefined)
      }
      searchBarPlaceholder="Filter loaded runs…  type:manual  run:2026-11"
      searchBarAccessory={
        <List.Dropdown tooltip="Run State" value={state} onChange={setState}>
          <List.Dropdown.Item title="All States" value="all" icon={Icon.List} />
          {STATES.map((s) => (
            <List.Dropdown.Item key={s} title={s} value={s} icon={stateIcon(s)} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <LoadErrorView title="Could Not Load DAG Runs" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Clock} title={state === "all" ? "No runs" : `No ${state} runs`} />
      )}
      {runs.map((run) => (
        <RunListItem
          key={run.dag_run_id}
          env={env}
          run={run}
          extraActions={
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
          }
        />
      ))}
    </List>
  );
}

/** One DAG-run row. `showDagId` for cross-DAG lists; `showEnv` adds the env as an accessory. */
export function RunListItem(props: {
  env: ComposerEnvironment;
  run: DagRun;
  showDagId?: boolean;
  showEnv?: boolean;
  /** Extra list-level actions (refresh, grouping, filters) added to the Navigate section. */
  extraActions?: React.ReactNode;
}) {
  const { env, run } = props;
  const client = clientFor(env);
  const when = run.logical_date ?? run.execution_date;
  const dur = durationBetween(run.start_date, run.end_date);
  const accessories: List.Item.Accessory[] = [];
  if (props.showEnv) accessories.push({ tag: { value: env.id, color: tierColor(env) } });
  if (run.note) accessories.push({ icon: Icon.SpeechBubble, tooltip: run.note });
  accessories.push({
    text: formatDuration(dur),
    icon: Icon.Stopwatch,
    tooltip: run.state === "running" ? "running" : undefined,
  });
  accessories.push({
    text: relativeTime(run.start_date ?? when),
    tooltip: `Started ${formatTimestamp(run.start_date)}`,
  });

  return (
    <List.Item
      icon={stateIcon(run.state)}
      title={props.showDagId ? run.dag_id : formatTimestamp(when)}
      subtitle={props.showDagId ? `${run.run_type} · ${formatTimestamp(when)}` : run.run_type}
      keywords={[run.dag_run_id, run.state, run.run_type]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Drill In">
            <Action.Push
              title={run.state === "failed" ? "Show Failed Tasks" : "Show Tasks"}
              icon={Icon.List}
              target={
                <TaskInstances
                  env={env}
                  dagId={run.dag_id}
                  runId={run.dag_run_id}
                  initialFilter={run.state === "failed" ? "failed" : "all"}
                />
              }
            />
            {run.state === "failed" && (
              <Action.Push
                title="Show All Tasks"
                icon={Icon.List}
                target={<TaskInstances env={env} dagId={run.dag_id} runId={run.dag_run_id} initialFilter="all" />}
              />
            )}
            <Action.Push
              title="Run Lineage (Upstream / Downstream)"
              icon={Icon.Network}
              shortcut={hotkey(["cmd"], "l")}
              target={<RunLineage env={env} dagId={run.dag_id} runId={run.dag_run_id} />}
            />
            <Action.Push
              title="DAG Performance"
              icon={Icon.BarChart}
              shortcut={hotkey(["cmd", "shift"], "p")}
              target={<DagPerformance env={env} dagId={run.dag_id} />}
            />
            <Action.OpenInBrowser
              title="Open Run in Airflow"
              url={client.uiRunUrl(run.dag_id, run.dag_run_id)}
              shortcut={hotkey(["cmd"], "o")}
            />
          </ActionPanel.Section>
          <NavigateSection>
            {props.showDagId && (
              <Action.Push
                title={`All Runs of ${run.dag_id}`}
                icon={Icon.ArrowsContract}
                shortcut={hotkey(["cmd", "shift"], "n")}
                target={<DagRuns env={env} dagId={run.dag_id} />}
              />
            )}
            <Action.Push
              title="DAG Details"
              icon={Icon.Info}
              shortcut={hotkey(["cmd"], "i")}
              target={<DagDetail env={env} dagId={run.dag_id} />}
            />
            <Action.Push
              title={`All DAGs in ${env.id}`}
              icon={Icon.ArrowsExpand}
              shortcut={hotkey(["cmd", "shift"], "w")}
              target={<DagList env={env} />}
            />
            {props.extraActions}
          </NavigateSection>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Run ID"
              content={run.dag_run_id}
              shortcut={hotkey(["cmd", "shift"], "c")}
            />
            <Action.CopyToClipboard title="Copy DAG ID" content={run.dag_id} />
            <Action.CopyToClipboard title="Copy Conf JSON" content={JSON.stringify(run.conf ?? {}, null, 2)} />
            <SaveQuicklinkAction
              context={{ project: env.project, env: env.name, dag: run.dag_id, run: run.dag_run_id }}
              name={`Airflow · ${run.dag_id} · ${run.dag_run_id}`}
            />
          </ActionPanel.Section>
          <EnvironmentActions env={env} />
        </ActionPanel>
      }
    />
  );
}
