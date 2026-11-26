// Level 1: Composer environments in the current project (switchable from the search bar dropdown,
// shared with the hub). Drill in -> DAGs (env / project).

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ProjectDropdown } from "../../../components/ProjectDropdown";
import { compareEnvironments, environmentTier } from "../lib/composer";
import { matches, parseSearch } from "../lib/filter";
import { relativeTime } from "../lib/format";
import {
  clientFor,
  envKey,
  envStateColor,
  errorText,
  isAirflow3,
  queryable,
  refreshEnvironments,
  resolveGcloudPath,
  setCurrentProject,
  useCurrentProject,
  tierColor,
  tierLabel,
  useEnvironments,
  useProjectProp,
} from "../lib/raycast";
import { ComposerEnvironment, HealthStatus } from "../lib/types";
import { DagList } from "./dag-list";
import { DiscoverView } from "./discover";
import { EnvironmentActions, NavigateSection, crumbs, detailShortcut, refreshShortcut } from "./env-actions";
import { FailuresList } from "./failures-list";
import { ImportErrorsList } from "./import-errors-list";
import { PerfOverview } from "./perf-overview";
import { DatasetsList } from "./datasets";

type HealthResult = { ok: true; health: HealthStatus } | { ok: false; error: string };

function healthSummary(h?: HealthResult): { text: string; color: Color; tooltip: string } {
  if (!h) return { text: "…", color: Color.SecondaryText, tooltip: "Checking health" };
  if (!h.ok) return { text: "unreachable", color: Color.Red, tooltip: h.error };
  const parts = [
    ["scheduler", h.health.scheduler?.status],
    ["metadb", h.health.metadatabase?.status],
    ["triggerer", h.health.triggerer?.status],
    ["dag_processor", h.health.dag_processor?.status],
  ].filter(([, s]) => s) as [string, string][];
  const bad = parts.filter(([, s]) => s !== "healthy");
  return {
    text: bad.length ? `${bad.map(([n]) => n).join(", ")} unhealthy` : "healthy",
    color: bad.length ? Color.Orange : Color.Green,
    tooltip: parts.map(([n, s]) => `${n}: ${s}`).join("\n"),
  };
}

export function EnvironmentsList(props: { project?: string; root?: boolean }) {
  useProjectProp(props.project);
  const project = useCurrentProject();
  const { data, isLoading, revalidate, error } = useEnvironments();
  const { data: gcloudPath } = useCachedPromise(resolveGcloudPath, []);
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const envs = data?.environments ?? [];
  const live = queryable(envs);
  const { data: health } = useCachedPromise(
    async (uris: string[]) => {
      const out: Record<string, HealthResult> = {};
      await Promise.all(
        uris.map(async (uri) => {
          try {
            out[uri] = { ok: true, health: await clientFor({ airflowUri: uri }).health() };
          } catch (e) {
            out[uri] = { ok: false, error: errorText(e) };
          }
        }),
      );
      return out;
    },
    [live.map((e) => e.airflowUri)],
    { keepPreviousData: true, execute: live.length > 0 },
  );

  const parsed = parseSearch(searchText);
  const visible = envs
    .filter((e) => !project || e.project === project)
    .filter((e) =>
      matches(
        parsed,
        { project: [e.project], env: [e.id, environmentTier(e)], is: [e.state.toLowerCase(), environmentTier(e)] },
        [e.id, e.project, e.imageVersion, environmentTier(e)],
      ),
    )
    .sort(compareEnvironments);
  const byProject = new Map<string, ComposerEnvironment[]>();
  visible.forEach((e) => byProject.set(e.project, [...(byProject.get(e.project) ?? []), e]));

  const errors = data?.errors ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : crumbs("Composer", project)}
      searchBarPlaceholder="Filter environments…  is:prod  is:running"
      searchBarAccessory={
        gcloudPath ? (
          <ProjectDropdown
            gcloudPath={gcloudPath}
            value={project ?? null}
            onChange={(id) => {
              if (id !== project) setCurrentProject(id);
            }}
          />
        ) : undefined
      }
    >
      {!isLoading && envs.length === 0 && (
        <List.EmptyView
          icon={Icon.Cloud}
          title={project ? `No Composer environments in ${project}` : "Select a project"}
          description={
            error
              ? errorText(error)
              : project
                ? "Pick another project from the dropdown, or run Discover to find projects with Composer."
                : "Pick a project from the dropdown."
          }
          actions={
            <ActionPanel>
              <Action.Push title="Discover Environments" icon={Icon.MagnifyingGlass} target={<DiscoverView />} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {[...byProject.entries()].map(([proj, list]) => (
        <List.Section key={proj} title={proj} subtitle={`${list.length} env`}>
          {list.map((env) => {
            const h = isAirflow3(env)
              ? {
                  text: "Airflow 3 not supported yet",
                  color: Color.Orange,
                  tooltip: "Only Airflow 2.x (REST API v1) is supported",
                }
              : healthSummary(health?.[env.airflowUri]);
            return (
              <List.Item
                key={envKey(env)}
                icon={{ source: Icon.Cloud, tintColor: envStateColor(env.state) }}
                title={env.id}
                subtitle={showDetail ? undefined : `Airflow ${env.airflowVersion ?? "?"}`}
                keywords={[env.project, env.location, environmentTier(env)]}
                accessories={
                  showDetail
                    ? [{ tag: { value: tierLabel(env), color: tierColor(env) } }]
                    : [
                        { tag: { value: tierLabel(env), color: tierColor(env) } },
                        { tag: { value: h.text, color: h.color }, tooltip: h.tooltip },
                        { text: env.imageVersion.replace(/-build\.\d+$/, ""), tooltip: env.imageVersion },
                      ]
                }
                detail={<EnvDetail env={env} health={health?.[env.airflowUri]} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Drill In">
                      <Action.Push
                        title="Browse DAGs"
                        icon={Icon.List}
                        target={<DagList env={env} parentTitle="Environments" />}
                      />
                      <Action.Push
                        title="Recent Failures in Environment"
                        icon={Icon.XMarkCircle}
                        shortcut={hotkey(["cmd", "shift"], "f")}
                        target={<FailuresList env={env} />}
                      />
                      <Action.Push
                        title="DAG Performance in Environment"
                        icon={Icon.BarChart}
                        shortcut={hotkey(["cmd", "shift"], "p")}
                        target={<PerfOverview env={env} />}
                      />
                      <Action.Push
                        title="Datasets & Lineage in Environment"
                        icon={Icon.Network}
                        shortcut={hotkey(["cmd"], "l")}
                        target={<DatasetsList env={env} />}
                      />
                      <Action.Push
                        title="Import Errors in Environment"
                        icon={Icon.Bug}
                        shortcut={hotkey(["cmd", "shift"], "i")}
                        target={<ImportErrorsList env={env} />}
                      />
                    </ActionPanel.Section>
                    <NavigateSection>
                      <Action.Push
                        title={`All DAGs in ${env.project}`}
                        icon={Icon.Folder}
                        target={<DagList project={env.project} parentTitle="Environments" />}
                      />
                      <Action.Push
                        title="All DAGs in All Environments"
                        icon={Icon.Globe}
                        target={<DagList parentTitle="Environments" />}
                      />
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={detailShortcut}
                        onAction={() => setShowDetail((s) => !s)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={refreshShortcut}
                        onAction={() => refreshEnvironments(revalidate)}
                      />
                    </NavigateSection>
                    <EnvironmentActions env={env} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {errors.length > 0 && (
        <List.Section title="Lookup Errors" subtitle={`${errors.length}`}>
          {errors.map((e) => (
            <List.Item
              key={`${e.project}/${e.location}`}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title={`${e.project} (${e.location})`}
              subtitle={e.message}
              accessories={[{ text: e.status ? `HTTP ${e.status}` : "error" }]}
              actions={
                <ActionPanel>
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action.CopyToClipboard title="Copy Error" content={e.message} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function EnvDetail(props: { env: ComposerEnvironment; health?: HealthResult }) {
  const { env, health } = props;
  const h = health?.ok ? health.health : undefined;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Environment" text={env.id} />
          <List.Item.Detail.Metadata.Label title="Project" text={env.project} />
          <List.Item.Detail.Metadata.Label title="Location" text={env.location} />
          <List.Item.Detail.Metadata.TagList title="State">
            <List.Item.Detail.Metadata.TagList.Item text={env.state} color={envStateColor(env.state)} />
            <List.Item.Detail.Metadata.TagList.Item text={tierLabel(env)} color={tierColor(env)} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Image" text={env.imageVersion} />
          <List.Item.Detail.Metadata.Link title="Airflow UI" target={env.airflowUri} text="Open" />
          {env.dagGcsPrefix && <List.Item.Detail.Metadata.Label title="DAGs Bucket" text={env.dagGcsPrefix} />}
          <List.Item.Detail.Metadata.Separator />
          {health && !health.ok && <List.Item.Detail.Metadata.Label title="Health" text={health.error} />}
          {h?.scheduler && (
            <List.Item.Detail.Metadata.Label
              title="Scheduler"
              text={`${h.scheduler.status} · ${relativeTime(h.scheduler.latest_scheduler_heartbeat)}`}
            />
          )}
          {h?.metadatabase && <List.Item.Detail.Metadata.Label title="Metadatabase" text={h.metadatabase.status} />}
          {h?.triggerer?.status && (
            <List.Item.Detail.Metadata.Label
              title="Triggerer"
              text={`${h.triggerer.status} · ${relativeTime(h.triggerer.latest_triggerer_heartbeat)}`}
            />
          )}
          {h?.dag_processor?.status && (
            <List.Item.Detail.Metadata.Label
              title="DAG Processor"
              text={`${h.dag_processor.status} · ${relativeTime(h.dag_processor.latest_dag_processor_heartbeat)}`}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={relativeTime(env.createTime)} />
          <List.Item.Detail.Metadata.Label title="Updated" text={relativeTime(env.updateTime)} />
          {Object.entries(env.labels ?? {}).map(([k, v]) => (
            <List.Item.Detail.Metadata.Label key={k} title={k} text={v} />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
