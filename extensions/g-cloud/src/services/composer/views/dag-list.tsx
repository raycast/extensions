// Level 2: DAGs. Scope dropdown = all environments / one project / one environment.
// Drill in -> runs / detail. Drill out -> widen scope. Search tokens filter within scope.

import { hotkey } from "../lib/shortcut";
import { SaveQuicklinkAction } from "./quicklink";
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
  stateIcon,
  tierColor,
  tierLabel,
  useEnvironments,
} from "../lib/raycast";
import { ComposerEnvironment, Dag, DagRun } from "../lib/types";
import { DagDetail } from "./dag-detail";
import { DagPerformance } from "./dag-performance";
import { DagRuns } from "./dag-runs";
import { DagTasks } from "./dag-tasks";
import { DagLineage } from "./lineage";
import { LineageGraphView } from "./lineage-graph";
import {
  EnvironmentActions,
  FilterSubmenu,
  LoadErrorView,
  NavigateSection,
  crumbs,
  refreshShortcut,
} from "./env-actions";

interface EnvDags {
  env: ComposerEnvironment;
  dags: Dag[];
  error?: string;
}

interface FailureInfo {
  count: number;
  latest?: DagRun;
  capped: boolean;
}

function scheduleText(d: Dag): string | undefined {
  return d.timetable_description || d.schedule_interval?.value || undefined;
}

export function DagList(props: {
  env?: ComposerEnvironment;
  project?: string;
  initialSearch?: string;
  /** Set when pushed from a parent level so "Up to …" can be offered. */
  parentTitle?: string;
  /** Rendered as a command's root view: keep the command title. */
  root?: boolean;
}) {
  const { data: envData, isLoading: envLoading, error: envError, revalidate: revalidateEnvs } = useEnvironments();
  // An environment handed in explicitly (e.g. from Discover, possibly in another project) is always in scope.
  const allEnvs = useMemo(() => {
    const listed = queryable(envData?.environments);
    const extra = queryable(props.env ? [props.env] : []).filter((e) => !listed.some((l) => envKey(l) === envKey(e)));
    return [...listed, ...extra].sort(compareEnvironments);
  }, [envData, props.env]);
  const initialScope = props.env ? `env:${envKey(props.env)}` : props.project ? `project:${props.project}` : "all";
  const [scope, setScope] = useState(initialScope);
  const [searchText, setSearchText] = useState(props.initialSearch ?? "");
  const hours = FAILURE_WINDOW_HOURS;

  const scopedEnvs = useMemo(() => {
    if (scope.startsWith("env:")) return allEnvs.filter((e) => `env:${envKey(e)}` === scope);
    if (scope.startsWith("project:")) return allEnvs.filter((e) => `project:${e.project}` === scope);
    return allEnvs;
  }, [allEnvs, scope]);
  const uris = scopedEnvs.map((e) => e.airflowUri);
  const single = scopedEnvs.length === 1 ? scopedEnvs[0] : undefined;

  // 1) DAG lists for every env in scope (parallel, per-env errors kept).
  const {
    data: envDags,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (uriList: string[]): Promise<EnvDags[]> =>
      Promise.all(
        scopedEnvs
          .filter((e) => uriList.includes(e.airflowUri))
          .map(async (env) => {
            try {
              return { env, dags: (await clientFor(env).listDags()).dags };
            } catch (e) {
              return { env, dags: [], error: errorText(e) };
            }
          }),
      ),
    [uris],
    { keepPreviousData: true, execute: uris.length > 0 },
  );

  // 2) Cheap "recently failed" signal for every env in scope: one capped failed-runs query each.
  const { data: failures, revalidate: revalidateFailures } = useCachedPromise(
    async (uriList: string[], h: number) => {
      const out: Record<string, FailureInfo> = {};
      await Promise.all(
        scopedEnvs
          .filter((e) => uriList.includes(e.airflowUri))
          .map(async (env) => {
            try {
              const { runs, total } = await clientFor(env).queryDagRuns(
                { states: ["failed"], start_date_gte: hoursAgoIso(h) },
                { max: 200 },
              );
              for (const r of runs) {
                const k = `${env.airflowUri}|${r.dag_id}`;
                const cur = out[k] ?? { count: 0, capped: total > runs.length };
                cur.count++;
                if (!cur.latest || (r.start_date ?? "") > (cur.latest.start_date ?? "")) cur.latest = r;
                out[k] = cur;
              }
            } catch {
              // failure signal is best-effort; DAG list still renders
            }
          }),
      );
      return out;
    },
    [uris, hours],
    { keepPreviousData: true, execute: uris.length > 0 },
  );

  // 3) Latest run per DAG - only for a single env (server-bound, ~140 ms per DAG).
  const [progress, setProgress] = useState<string>();
  const [partial, setPartial] = useState<Record<string, DagRun>>();
  const singleDagIds = single
    ? (envDags?.find((x) => x.env.airflowUri === single.airflowUri)?.dags ?? []).map((d) => d.dag_id)
    : [];
  const {
    data: latestDone,
    isLoading: latestLoading,
    revalidate: revalidateLatest,
  } = useCachedPromise(
    async (uri: string, ids: string[]) => {
      setPartial(undefined);
      const map = await clientFor({ airflowUri: uri }).latestRuns(ids, {
        onProgress: (d, t, m) => {
          setProgress(d < t ? `latest runs ${d}/${t}` : undefined);
          // stream icons in batches so the list fills in while the server works through the DAGs
          if (d % 10 === 0 || d === t) setPartial(Object.fromEntries(m));
        },
      });
      setProgress(undefined);
      return Object.fromEntries(map) as Record<string, DagRun>;
    },
    [single?.airflowUri ?? "", singleDagIds],
    { keepPreviousData: true, execute: !!single && singleDagIds.length > 0 },
  );
  const refreshAll = () => {
    refreshEnvironments(revalidateEnvs);
    revalidate();
    revalidateFailures();
    if (single) revalidateLatest();
  };
  const latest = latestLoading && partial ? { ...latestDone, ...partial } : (latestDone ?? partial);

  const parsed = parseSearch(searchText);
  const projects = useMemo(() => Array.from(new Set(allEnvs.map((e) => e.project))).sort(), [allEnvs]);
  const scopeLabel = single ? single.id : scope.startsWith("project:") ? scope.slice(8) : "All environments";
  let shown = 0;
  let total = 0;

  const sections = (envDags ?? []).map(({ env, dags, error }) => {
    const items = dags.filter((d) => {
      const f = failures?.[`${env.airflowUri}|${d.dag_id}`];
      const l = single ? latest?.[d.dag_id] : undefined;
      const flags = [
        d.is_paused ? "paused" : "active",
        d.has_import_errors ? "import-error" : undefined,
        f ? "failed" : undefined,
        l?.state ? `latest-${l.state}` : undefined,
      ];
      return matches(
        parsed,
        {
          project: [env.project],
          env: [env.id, tierLabel(env)],
          dag: [d.dag_id],
          tag: (d.tags ?? []).map((t) => t.name),
          owner: d.owners,
          is: flags,
        },
        [d.dag_id, d.description, ...(d.tags ?? []).map((t) => t.name), ...d.owners, d.fileloc.split("/").pop()],
      );
    });
    total += dags.length;
    shown += items.length;
    return { env, items, error, totalDags: dags.length };
  });

  const nav = crumbs(
    scopeLabel,
    !envDags
      ? "loading DAGs…"
      : (progress ?? (parsed.tokens.length || parsed.words.length ? `${shown}/${total}` : `${total} DAGs`)),
  );

  return (
    <List
      isLoading={envLoading || isLoading || latestLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : nav}
      searchBarPlaceholder="Filter DAGs…  is:failed (in window)  is:latest-failed  tag:dbt  env:prod  -is:paused"
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" value={scope} onChange={setScope}>
          <List.Dropdown.Item title="All Environments" value="all" icon={Icon.Globe} />
          {projects.map((p) => (
            <List.Dropdown.Section key={p} title={p}>
              <List.Dropdown.Item title={`All in ${p}`} value={`project:${p}`} icon={Icon.Folder} />
              {allEnvs
                .filter((e) => e.project === p)
                .map((e) => (
                  <List.Dropdown.Item
                    key={envKey(e)}
                    title={`${e.id}  (${tierLabel(e)})`}
                    value={`env:${envKey(e)}`}
                    icon={{ source: Icon.Cloud, tintColor: tierColor(e) }}
                    keywords={[e.project, tierLabel(e)]}
                  />
                ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {envError && !allEnvs.length ? (
        <LoadErrorView title="Could Not List Environments" error={envError} onRetry={refreshAll} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={total ? "No DAGs match" : "No DAGs"}
          description={total ? "Clear filters with ⌘F → Clear Filters" : undefined}
        />
      )}
      {sections.map(({ env, items, error, totalDags }) => (
        <List.Section
          key={envKey(env)}
          title={`${env.id} · ${env.project}`}
          subtitle={
            error
              ? "error"
              : `${items.length}/${totalDags}${single ? "" : " · latest-run state: narrow to one env (⌘⇧N)"}`
          }
        >
          {error && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title="Could not list DAGs"
              subtitle={error}
              actions={
                <ActionPanel>
                  <EnvironmentActions env={env} />
                </ActionPanel>
              }
            />
          )}
          {items.map((d) => {
            const f = failures?.[`${env.airflowUri}|${d.dag_id}`];
            const l = single ? latest?.[d.dag_id] : undefined;
            const iconState = l?.state ?? (f ? "failed" : undefined);
            const accessories: List.Item.Accessory[] = [];
            if (d.is_paused) accessories.push({ tag: { value: "paused", color: Color.SecondaryText } });
            if (d.has_import_errors) accessories.push({ tag: { value: "import error", color: Color.Red } });
            if (f)
              accessories.push({
                tag: { value: `${f.count}${f.capped ? "+" : ""} failed/${hours}h`, color: Color.Red },
                tooltip: `Latest failure ${relativeTime(f.latest?.start_date)}: ${f.latest?.dag_run_id}`,
              });
            (d.tags ?? []).slice(0, 2).forEach((t) => accessories.push({ tag: t.name }));
            const sched = scheduleText(d);
            if (sched) accessories.push({ text: sched, icon: Icon.Calendar });
            if (l)
              accessories.push({
                text: relativeTime(l.start_date ?? l.execution_date),
                tooltip: `${l.state}: ${l.dag_run_id}`,
              });
            return (
              <List.Item
                key={`${envKey(env)}|${d.dag_id}`}
                icon={iconState ? stateIcon(iconState) : d.is_paused ? Icon.Pause : Icon.Circle}
                title={d.dag_id}
                subtitle={d.owners.join(", ")}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Drill In">
                      <Action.Push title="Show Runs" icon={Icon.List} target={<DagRuns env={env} dagId={d.dag_id} />} />
                      <Action.Push
                        title="Show Failed Runs"
                        icon={Icon.XMarkCircle}
                        shortcut={hotkey(["cmd", "shift"], "f")}
                        target={<DagRuns env={env} dagId={d.dag_id} initialState="failed" />}
                      />
                      <Action.Push
                        title="Performance"
                        icon={Icon.BarChart}
                        shortcut={hotkey(["cmd", "shift"], "p")}
                        target={<DagPerformance env={env} dagId={d.dag_id} />}
                      />
                      <Action.Push
                        title="Task Breakdown"
                        icon={Icon.Stopwatch}
                        shortcut={hotkey(["cmd"], "t")}
                        target={<DagTasks env={env} dagId={d.dag_id} />}
                      />
                      <Action.Push
                        title="Dataset Lineage"
                        icon={Icon.Network}
                        shortcut={hotkey(["cmd"], "l")}
                        target={<DagLineage env={env} dagId={d.dag_id} />}
                      />
                      <Action.Push
                        title="Lineage Graph"
                        icon={Icon.Switch}
                        shortcut={hotkey(["cmd"], "g")}
                        target={<LineageGraphView env={env} dagId={d.dag_id} />}
                      />
                      <Action.Push
                        title="Show DAG Details"
                        icon={Icon.Info}
                        shortcut={hotkey(["cmd"], "i")}
                        target={<DagDetail env={env} dagId={d.dag_id} />}
                      />
                      <Action.OpenInBrowser
                        title="Open DAG in Airflow"
                        url={clientFor(env).uiDagUrl(d.dag_id)}
                        shortcut={hotkey(["cmd"], "o")}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Filter">
                      <FilterSubmenu
                        searchText={searchText}
                        setSearchText={setSearchText}
                        options={[
                          { key: "is", value: "failed", title: `Failed in Last ${hours}h` },
                          { key: "is", value: "active", title: "Active (Not Paused)" },
                          { key: "is", value: "paused", title: "Paused" },
                          { key: "is", value: "import-error", title: "Import Errors" },
                          ...(single
                            ? [
                                { key: "is" as const, value: "latest-failed", title: "Latest Run Failed (Any Age)" },
                                { key: "is" as const, value: "latest-running", title: "Latest Run Running" },
                                { key: "is" as const, value: "latest-success", title: "Latest Run Succeeded" },
                              ]
                            : []),
                          ...(d.tags ?? []).map((t) => ({
                            key: "tag" as const,
                            value: t.name,
                            title: `Tag: ${t.name}`,
                          })),
                          ...d.owners.map((o) => ({ key: "owner" as const, value: o, title: `Owner: ${o}` })),
                        ]}
                      />
                    </ActionPanel.Section>
                    <NavigateSection upTitle={props.parentTitle}>
                      {!single && (
                        <Action
                          title={`Narrow to ${env.id}`}
                          icon={Icon.ArrowsContract}
                          shortcut={hotkey(["cmd", "shift"], "n")}
                          onAction={() => setScope(`env:${envKey(env)}`)}
                        />
                      )}
                      {scope !== `project:${env.project}` && (
                        <Action
                          title={`Widen to Project ${env.project}`}
                          icon={Icon.ArrowsExpand}
                          shortcut={hotkey(["cmd", "shift"], "w")}
                          onAction={() => setScope(`project:${env.project}`)}
                        />
                      )}
                      {scope !== "all" && (
                        <Action
                          title="Widen to All Environments"
                          icon={Icon.Globe}
                          shortcut={hotkey(["cmd", "shift"], "g")}
                          onAction={() => setScope("all")}
                        />
                      )}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={refreshShortcut}
                        onAction={refreshAll}
                      />
                    </NavigateSection>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy DAG ID"
                        content={d.dag_id}
                        shortcut={hotkey(["cmd", "shift"], "c")}
                      />
                      <Action.CopyToClipboard title="Copy File Location" content={d.fileloc} />
                      <SaveQuicklinkAction
                        context={{ project: env.project, env: env.name, dag: d.dag_id }}
                        name={`Airflow · ${d.dag_id}`}
                      />
                    </ActionPanel.Section>
                    <EnvironmentActions env={env} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
