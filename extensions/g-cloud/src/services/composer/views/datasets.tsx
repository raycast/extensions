// Datasets browser (per environment) + dataset detail (producers, consumers, recent events)
// + run-level lineage (what triggered this run / which downstream runs it created).

import { hotkey } from "../lib/shortcut";
import { SwitchProjectAction } from "./project-picker";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { compareEnvironments } from "../lib/composer";
import { matches, parseSearch } from "../lib/filter";
import { formatTimestamp, relativeTime } from "../lib/format";
import { KIND_LABEL, SignalKind, buildGraph, signalKind } from "../lib/lineage";
import {
  clientFor,
  envKey,
  errorText,
  queryable,
  refreshEnvironments,
  tierColor,
  tierLabel,
  useEnvironments,
} from "../lib/raycast";
import { ComposerEnvironment, Dataset, DatasetEvent } from "../lib/types";
import { DagRuns } from "./dag-runs";
import { EnvironmentActions, FilterSubmenu, LoadErrorView, crumbs, refreshShortcut } from "./env-actions";
import { DagLineage, openLineageDiagram, useLineageGraph } from "./lineage";
import { TaskInstances } from "./task-instances";

const KIND_COLOR: Record<SignalKind, Color> = {
  success: Color.Green,
  done: Color.Blue,
  failed: Color.Red,
  complete: Color.Yellow,
  data: Color.Purple,
};

export function DatasetsList(props: { env?: ComposerEnvironment; root?: boolean }) {
  const { data: envData, isLoading: envLoading, error: envError, revalidate: revalidateEnvs } = useEnvironments();
  const envs = useMemo(() => queryable(envData?.environments).sort(compareEnvironments), [envData]);
  const [selected, setSelected] = useState<string>(props.env ? envKey(props.env) : "");
  const env = envs.find((e) => envKey(e) === selected) ?? queryable(props.env ? [props.env] : [])[0] ?? envs[0];
  return env ? (
    <DatasetsForEnv env={env} envs={envs} onEnv={setSelected} loadingEnvs={envLoading} root={props.root} />
  ) : (
    <List
      isLoading={envLoading}
      navigationTitle={props.root ? undefined : "Datasets"}
      searchBarPlaceholder="Filter datasets…"
    >
      {envError && (
        <LoadErrorView
          title="Could Not List Environments"
          error={envError}
          onRetry={() => refreshEnvironments(revalidateEnvs)}
        />
      )}
    </List>
  );
}

function DatasetsForEnv(props: {
  env: ComposerEnvironment;
  envs: ComposerEnvironment[];
  onEnv: (k: string) => void;
  loadingEnvs: boolean;
  root?: boolean;
}) {
  const { env } = props;
  const [searchText, setSearchText] = useState("");
  const [view, setView] = useState("linked");
  const { data, isLoading, error, revalidate } = useLineageGraph(env);
  const g = useMemo(() => (data ? buildGraph(data.datasets) : undefined), [data]);
  const parsed = parseSearch(searchText);
  const all = data?.datasets ?? [];
  const filtered = all.filter((d) => {
    const linked = d.producing_tasks.length > 0 && d.consuming_dags.length > 0;
    if (view === "linked" && !linked) return false;
    if (view === "unconsumed" && (d.consuming_dags.length || !d.producing_tasks.length)) return false;
    if (view === "orphan" && (d.producing_tasks.length || d.consuming_dags.length)) return false;
    const producers = d.producing_tasks.map((p) => p.dag_id);
    const consumers = d.consuming_dags.map((c) => c.dag_id);
    return matches(
      parsed,
      { dag: [...producers, ...consumers], type: [signalKind(d.uri)], is: [linked ? "linked" : "unlinked"] },
      [d.uri, ...producers, ...consumers],
    );
  });
  const counts = {
    linked: all.filter((d) => d.producing_tasks.length && d.consuming_dags.length).length,
    unconsumed: all.filter((d) => d.producing_tasks.length && !d.consuming_dags.length).length,
    orphan: all.filter((d) => !d.producing_tasks.length && !d.consuming_dags.length).length,
  };
  const shown = filtered.slice(0, 300);

  return (
    <List
      isLoading={isLoading || props.loadingEnvs}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={
        props.root
          ? undefined
          : crumbs(env.id, "datasets", g ? `${all.length} · ${g.edges.length} DAG edges` : "loading…")
      }
      searchBarPlaceholder="Filter datasets…  dag:retention  type:success  type:failed"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Environment / View"
          value={`${envKey(env)}|${view}`}
          onChange={(v) => {
            const [k, vw] = v.split("|");
            props.onEnv(k);
            setView(vw);
          }}
        >
          {props.envs.map((e) => (
            <List.Dropdown.Section key={envKey(e)} title={`${e.id} (${tierLabel(e)})`}>
              <List.Dropdown.Item
                title={`${e.id} · Linked (feeds a DAG)`}
                value={`${envKey(e)}|linked`}
                icon={{ source: Icon.Network, tintColor: tierColor(e) }}
              />
              <List.Dropdown.Item
                title={`${e.id} · Produced, not consumed`}
                value={`${envKey(e)}|unconsumed`}
                icon={Icon.ArrowRight}
              />
              <List.Dropdown.Item title={`${e.id} · All datasets`} value={`${envKey(e)}|all`} icon={Icon.List} />
              <List.Dropdown.Item
                title={`${e.id} · Orphans (no producer/consumer)`}
                value={`${envKey(e)}|orphan`}
                icon={Icon.QuestionMark}
              />
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {error && <List.EmptyView icon={Icon.Warning} title="Could not load datasets" description={errorText(error)} />}
      {!isLoading && !error && all.length === 0 && (
        <List.EmptyView
          icon={Icon.Info}
          title={`No datasets in ${env.id}`}
          description="This environment does not use dataset scheduling."
        />
      )}
      <List.Section
        title={`${
          view === "linked"
            ? "Linked"
            : view === "unconsumed"
              ? "Produced, not consumed"
              : view === "orphan"
                ? "Orphans"
                : "All"
        }`}
        subtitle={`${filtered.length}${filtered.length > shown.length ? ` (showing ${shown.length})` : ""} · linked ${
          counts.linked
        } · unconsumed ${counts.unconsumed} · orphan ${counts.orphan}`}
      >
        {shown.map((d) => {
          const kind = signalKind(d.uri);
          const producer = d.producing_tasks[0]?.dag_id;
          return (
            <List.Item
              key={d.id}
              icon={{ source: Icon.Coins, tintColor: KIND_COLOR[kind] }}
              title={d.uri}
              subtitle={producer ? `by ${producer}` : undefined}
              accessories={[
                { tag: { value: KIND_LABEL[kind], color: KIND_COLOR[kind] } },
                ...(d.consuming_dags.length
                  ? [
                      {
                        tag: {
                          value: `→ ${d.consuming_dags.length} DAG${d.consuming_dags.length > 1 ? "s" : ""}`,
                          color: Color.Green,
                        },
                      },
                    ]
                  : []),
                { text: relativeTime(d.updated_at), tooltip: `updated ${formatTimestamp(d.updated_at)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Dataset Detail"
                    icon={Icon.Info}
                    target={<DatasetDetail env={env} dataset={d} />}
                  />
                  {producer && (
                    <Action.Push
                      title={`Lineage of ${producer}`}
                      icon={Icon.Network}
                      shortcut={hotkey(["cmd"], "l")}
                      target={<DagLineage env={env} dagId={producer} />}
                    />
                  )}
                  {g && producer && (
                    <Action
                      title="Open Environment Diagram"
                      icon={Icon.Globe}
                      shortcut={hotkey(["cmd", "shift"], "d")}
                      onAction={() => openLineageDiagram(env, g, producer, Infinity, [], true)}
                    />
                  )}
                  <FilterSubmenu
                    searchText={searchText}
                    setSearchText={setSearchText}
                    options={[
                      ...(producer ? [{ key: "dag" as const, value: producer, title: `DAG: ${producer}` }] : []),
                      { key: "type", value: kind, title: `Signal: ${KIND_LABEL[kind]}` },
                    ]}
                  />
                  <Action.CopyToClipboard title="Copy URI" content={d.uri} shortcut={hotkey(["cmd", "shift"], "c")} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={revalidate} />
                  <SwitchProjectAction />
                  <EnvironmentActions env={env} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export function DatasetDetail(props: { env: ComposerEnvironment; dataset: Dataset }) {
  const { env, dataset: d } = props;
  const { data, isLoading, error } = useCachedPromise(
    (uri: string, id: number) => clientFor({ airflowUri: uri }).datasetEvents({ datasetId: id, limit: 25 }),
    [env.airflowUri, d.id],
  );
  const kind = signalKind(d.uri);
  return (
    <List
      isLoading={isLoading}
      navigationTitle={crumbs(env.id, d.uri)}
      searchBarPlaceholder="Filter producers, consumers and events…"
    >
      <List.Section title="Dataset" subtitle={KIND_LABEL[kind]}>
        <List.Item
          icon={{ source: Icon.Coins, tintColor: KIND_COLOR[kind] }}
          title={d.uri}
          accessories={[{ text: `updated ${relativeTime(d.updated_at)}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy URI" content={d.uri} />
              <EnvironmentActions env={env} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Produced By" subtitle={`${d.producing_tasks.length}`}>
        {d.producing_tasks.map((p) => (
          <List.Item
            key={`${p.dag_id}.${p.task_id}`}
            icon={{ source: Icon.ArrowUp, tintColor: Color.Blue }}
            title={p.dag_id}
            subtitle={`task ${p.task_id}`}
            actions={
              <ActionPanel>
                <Action.Push title="Lineage" icon={Icon.Network} target={<DagLineage env={env} dagId={p.dag_id} />} />
                <Action.Push title="Runs" icon={Icon.List} target={<DagRuns env={env} dagId={p.dag_id} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Consumed By" subtitle={`${d.consuming_dags.length}`}>
        {d.consuming_dags.map((c) => (
          <List.Item
            key={c.dag_id}
            icon={{ source: Icon.ArrowDown, tintColor: Color.Green }}
            title={c.dag_id}
            actions={
              <ActionPanel>
                <Action.Push title="Lineage" icon={Icon.Network} target={<DagLineage env={env} dagId={c.dag_id} />} />
                <Action.Push title="Runs" icon={Icon.List} target={<DagRuns env={env} dagId={c.dag_id} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section
        title="Recent Events"
        subtitle={error ? errorText(error) : `${data?.events.length ?? 0} of ${data?.total ?? "…"}`}
      >
        {(data?.events ?? []).map((e) => (
          <EventItem key={e.id} env={env} event={e} />
        ))}
      </List.Section>
    </List>
  );
}

function EventItem(props: { env: ComposerEnvironment; event: DatasetEvent; label?: string }) {
  const { env, event: e } = props;
  const status = (e.extra as { status?: string } | null | undefined)?.status;
  const created = e.created_dagruns ?? [];
  return (
    <List.Item
      icon={{ source: Icon.Bolt, tintColor: status === "failed" ? Color.Red : Color.Yellow }}
      title={props.label ?? e.source_dag_id ?? "external"}
      subtitle={props.label ? (e.source_dag_id ?? undefined) : (e.source_run_id ?? undefined)}
      accessories={[
        ...(created.length
          ? [{ tag: { value: `triggered ${created.length} run${created.length > 1 ? "s" : ""}`, color: Color.Green } }]
          : []),
        ...(status ? [{ tag: status }] : []),
        { text: relativeTime(e.timestamp), tooltip: formatTimestamp(e.timestamp) },
      ]}
      actions={
        <ActionPanel>
          {e.source_dag_id && e.source_run_id && (
            <Action.Push
              title="Source Run Tasks"
              icon={Icon.List}
              target={<TaskInstances env={env} dagId={e.source_dag_id} runId={e.source_run_id} />}
            />
          )}
          {created.map((r) => (
            <Action.Push
              key={`${r.dag_id}|${r.dag_run_id}`}
              title={`Triggered: ${r.dag_id}`}
              icon={Icon.ArrowDown}
              target={<TaskInstances env={env} dagId={r.dag_id} runId={r.dag_run_id} />}
            />
          ))}
          {e.source_dag_id && (
            <Action.Push
              title="Source DAG Lineage"
              icon={Icon.Network}
              target={<DagLineage env={env} dagId={e.source_dag_id} />}
            />
          )}
          <Action.CopyToClipboard title="Copy Event JSON" content={JSON.stringify(e, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

/** Run-level lineage: events that triggered this run, and events it emitted (+ runs they created). */
export function RunLineage(props: { env: ComposerEnvironment; dagId: string; runId: string }) {
  const { env, dagId, runId } = props;
  const { data, isLoading, error } = useCachedPromise(
    async (uri: string, d: string, r: string) => {
      const c = clientFor({ airflowUri: uri });
      const [upstream, emitted] = await Promise.all([
        c.upstreamDatasetEvents(d, r),
        c.datasetEvents({ sourceDagId: d, sourceRunId: r, limit: 50 }),
      ]);
      // guard: keep only events really emitted by this run, even if the server ignored a filter
      return { upstream, emitted: emitted.events.filter((e) => e.source_dag_id === d && e.source_run_id === r) };
    },
    [env.airflowUri, dagId, runId],
  );
  return (
    <List isLoading={isLoading} navigationTitle={crumbs(dagId, runId, "lineage")} searchBarPlaceholder="Filter runs…">
      {error && (
        <List.EmptyView icon={Icon.Warning} title="Could not load run lineage" description={errorText(error)} />
      )}
      <List.Section title="Triggered By" subtitle={`${data?.upstream.length ?? 0} dataset event(s)`}>
        {(data?.upstream ?? []).map((e) => (
          <EventItem key={`u${e.id}`} env={env} event={e} label={e.dataset_uri} />
        ))}
      </List.Section>
      <List.Section title="Emitted" subtitle={`${data?.emitted.length ?? 0} event(s)`}>
        {(data?.emitted ?? []).map((e) => (
          <EventItem key={`e${e.id}`} env={env} event={e} label={e.dataset_uri} />
        ))}
      </List.Section>
      {data && !data.upstream.length && !data.emitted.length && (
        <List.EmptyView
          icon={Icon.Info}
          title="No dataset events for this run"
          description="It was not dataset-triggered and emitted no datasets."
        />
      )}
    </List>
  );
}
