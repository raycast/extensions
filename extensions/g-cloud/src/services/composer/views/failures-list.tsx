// Cross-cutting debug view: failed DAG runs in a time window across environments in scope.
// Group by run (default) or by DAG. Drill in -> failed tasks -> log.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { compareEnvironments } from "../lib/composer";
import { matches, parseSearch } from "../lib/filter";
import { hoursAgoIso, relativeTime } from "../lib/format";
import {
  clientFor,
  envKey,
  errorText,
  FAILURE_WINDOW_HOURS,
  queryable,
  refreshEnvironments,
  tierColor,
  tierLabel,
  useEnvironments,
} from "../lib/raycast";
import { ComposerEnvironment, DagRun } from "../lib/types";
import { DagRuns, RunListItem } from "./dag-runs";
import {
  EnvironmentActions,
  FilterSubmenu,
  LoadErrorView,
  NavigateSection,
  crumbs,
  refreshShortcut,
} from "./env-actions";

const MAX_PER_ENV = 200;
const WINDOWS = [6, 24, 72, 168];

interface EnvFailures {
  env: ComposerEnvironment;
  runs: DagRun[];
  total: number;
  error?: string;
}

export function FailuresList(props: { env?: ComposerEnvironment; project?: string; root?: boolean }) {
  const { data: envData, isLoading: envLoading, error: envError, revalidate: revalidateEnvs } = useEnvironments();
  const prefHours = FAILURE_WINDOW_HOURS;
  const [hours, setHours] = useState(String(prefHours));
  const [groupByDag, setGroupByDag] = useState(false);
  const [searchText, setSearchText] = useState("");

  const scoped = useMemo(() => {
    const list = queryable(props.env && !envData ? [props.env] : envData?.environments);
    return list
      .filter((e) => (props.env ? envKey(e) === envKey(props.env) : true))
      .filter((e) => (props.project ? e.project === props.project : true))
      .sort(compareEnvironments);
  }, [envData, props.env, props.project]);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (uris: string[], h: number): Promise<EnvFailures[]> =>
      Promise.all(
        scoped
          .filter((e) => uris.includes(e.airflowUri))
          .map(async (env) => {
            try {
              const { runs, total } = await clientFor(env).queryDagRuns(
                { states: ["failed"], start_date_gte: hoursAgoIso(h), order_by: "-start_date" },
                { max: MAX_PER_ENV },
              );
              return { env, runs, total };
            } catch (e) {
              return { env, runs: [], total: 0, error: errorText(e) };
            }
          }),
      ),
    [scoped.map((e) => e.airflowUri), Number(hours)],
    { keepPreviousData: true, execute: scoped.length > 0 },
  );

  const parsed = parseSearch(searchText);
  const sections = (data ?? []).map((s) => ({
    ...s,
    runs: s.runs.filter((r) =>
      matches(
        parsed,
        {
          project: [s.env.project],
          env: [s.env.id, tierLabel(s.env)],
          dag: [r.dag_id],
          run: [r.dag_run_id],
          type: [r.run_type],
        },
        [r.dag_id, r.dag_run_id, s.env.id, r.run_type],
      ),
    ),
  }));
  const totalShown = sections.reduce((n, s) => n + s.runs.length, 0);
  const windowLabel = Number(hours) % 24 === 0 && Number(hours) >= 48 ? `${Number(hours) / 24}d` : `${hours}h`;
  const scopeLabel = props.env?.id ?? props.project ?? "All environments";
  const windows = Array.from(new Set([...WINDOWS, prefHours])).sort((a, b) => a - b);

  const groupToggle = (
    <Action
      title={groupByDag ? "Group by Run" : "Group by DAG"}
      icon={Icon.AppWindowList}
      shortcut={hotkey(["cmd"], "g")}
      onAction={() => setGroupByDag((g) => !g)}
    />
  );
  const filterMenu = (
    <FilterSubmenu
      searchText={searchText}
      setSearchText={setSearchText}
      options={[
        { key: "env", value: "prod", title: "Prod Environments" },
        { key: "env", value: "stage", title: "Stage Environments" },
        { key: "env", value: "dev", title: "Dev Environments" },
        { key: "type", value: "scheduled", title: "Scheduled Runs" },
        { key: "type", value: "manual", title: "Manual Runs" },
      ]}
    />
  );

  return (
    <List
      isLoading={envLoading || isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : crumbs(scopeLabel, `${totalShown} failed in ${windowLabel}`)}
      searchBarPlaceholder="Filter failures…  dag:dwh  env:prod  type:scheduled"
      searchBarAccessory={
        <List.Dropdown tooltip="Window" value={hours} onChange={setHours}>
          {windows.map((h) => (
            <List.Dropdown.Item
              key={h}
              title={h % 24 === 0 && h >= 48 ? `Last ${h / 24} days` : `Last ${h} hours`}
              value={String(h)}
              icon={Icon.Clock}
            />
          ))}
        </List.Dropdown>
      }
    >
      {envError && !scoped.length ? (
        <LoadErrorView
          title="Could Not List Environments"
          error={envError}
          onRetry={() => refreshEnvironments(revalidateEnvs)}
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={isLoading ? "Loading…" : `No failed runs in the last ${windowLabel}`}
          description={`${scoped.length} environment(s) checked`}
        />
      )}
      {sections.map((s) => {
        const capped = s.total > s.runs.length && !parsed.tokens.length && !parsed.words.length;
        const subtitle = s.error
          ? "error"
          : `${s.runs.length}${capped ? ` of ${s.total} (capped at ${MAX_PER_ENV})` : ""} · ${tierLabel(s.env)} · ${
              s.env.project
            }`;
        if (s.error)
          return (
            <List.Section key={envKey(s.env)} title={s.env.id} subtitle={subtitle}>
              <List.Item
                icon={{ source: Icon.Warning, tintColor: Color.Red }}
                title="Could not query runs"
                subtitle={s.error}
                actions={
                  <ActionPanel>
                    <EnvironmentActions env={s.env} />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        if (!s.runs.length) return null;
        if (!groupByDag)
          return (
            <List.Section key={envKey(s.env)} title={s.env.id} subtitle={subtitle}>
              {s.runs.map((r) => (
                <RunListItemWithExtras
                  key={`${r.dag_id}|${r.dag_run_id}`}
                  env={s.env}
                  run={r}
                  extra={
                    <>
                      {groupToggle}
                      {filterMenu}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={refreshShortcut}
                        onAction={revalidate}
                      />
                    </>
                  }
                />
              ))}
            </List.Section>
          );
        const byDag = new Map<string, DagRun[]>();
        s.runs.forEach((r) => byDag.set(r.dag_id, [...(byDag.get(r.dag_id) ?? []), r]));
        return (
          <List.Section key={envKey(s.env)} title={s.env.id} subtitle={`${byDag.size} DAGs · ${subtitle}`}>
            {[...byDag.entries()]
              .sort((a, b) => b[1].length - a[1].length)
              .map(([dagId, runs]) => (
                <List.Item
                  key={dagId}
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  title={dagId}
                  accessories={[
                    { tag: { value: `${runs.length} failed`, color: Color.Red } },
                    { tag: { value: s.env.id, color: tierColor(s.env) } },
                    { text: relativeTime(runs[0].start_date), tooltip: `Latest: ${runs[0].dag_run_id}` },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Show Failed Runs"
                        icon={Icon.List}
                        target={<DagRuns env={s.env} dagId={dagId} initialState="failed" />}
                      />
                      <Action.Push
                        title="Show All Runs"
                        icon={Icon.List}
                        target={<DagRuns env={s.env} dagId={dagId} />}
                      />
                      <Action.OpenInBrowser
                        title="Open DAG in Airflow"
                        url={clientFor(s.env).uiDagUrl(dagId)}
                        shortcut={hotkey(["cmd"], "o")}
                      />
                      <NavigateSection>
                        {groupToggle}
                        {filterMenu}
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={refreshShortcut}
                          onAction={revalidate}
                        />
                      </NavigateSection>
                      <Action.CopyToClipboard title="Copy DAG ID" content={dagId} />
                      <EnvironmentActions env={s.env} />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        );
      })}
    </List>
  );
}

/** RunListItem with extra list-level actions appended (group toggle, filters, refresh). */
function RunListItemWithExtras(props: { env: ComposerEnvironment; run: DagRun; extra: React.ReactNode }) {
  // RunListItem owns its ActionPanel; list-level actions are reachable via its Refresh plus ⌘G here.
  return <RunListItem env={props.env} run={props.run} showDagId extraActions={props.extra} />;
}
