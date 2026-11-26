// Discover Composer environments in projects matching a name pattern. Organizations can have
// thousands of projects and the Composer API has no location wildcard, so the scan is filtered by
// project-name pattern and runs one region at a time (the dropdown).

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listEnvironmentsIn, mapLimit } from "../lib/composer";
import { getProjects } from "../../../gcloud";
import {
  currentProject,
  envKey,
  errorText,
  prefs,
  resolveGcloudPath,
  setCurrentProject,
  tierColor,
  tierLabel,
  tokens,
} from "../lib/raycast";
import { GCP_REGIONS } from "../../../utils/regions";
import { ApiError, ComposerEnvironment } from "../lib/types";
import { DagList } from "./dag-list";
import { EnvironmentsList } from "./environments-list";

const DEFAULT_PATTERN = "composer|airflow|orchestr|data";
const MAX_PROJECTS = 400;

function compile(pattern: string): RegExp {
  try {
    return new RegExp(pattern, "i");
  } catch (e) {
    showFailureToast(e, { title: `Invalid pattern "${pattern}", using default` });
    return new RegExp(DEFAULT_PATTERN, "i");
  }
}

interface ScanResult {
  matched: number;
  scanned: number;
  envs: ComposerEnvironment[];
  errors: { project: string; location: string; message: string; status?: number }[];
}

export function DiscoverView(props: { root?: boolean } = {}) {
  const current = currentProject();
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [region, setRegion] = useState(prefs().defaultRegion || GCP_REGIONS[0].name);
  const locations = [region];
  const [searchText, setSearchText] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const { data: projectIds, isLoading: projectsLoading } = useCachedPromise(
    async () => (await getProjects(await resolveGcloudPath())).map((p) => p.id),
    [],
    { keepPreviousData: true },
  );

  const { data: scan, isLoading: scanning } = useCachedPromise(
    async (ids: string[], pat: string, locations: string[]): Promise<ScanResult> => {
      const re = compile(pat);
      const matched = ids.filter((p) => re.test(p));
      const toScan = matched.slice(0, MAX_PROJECTS);
      const envs: ComposerEnvironment[] = [];
      const errors: ScanResult["errors"] = [];
      const pairs = toScan.flatMap((project) => locations.map((location) => ({ project, location })));
      await mapLimit(pairs, 12, async ({ project, location }) => {
        try {
          envs.push(...(await listEnvironmentsIn(tokens(), project, location)));
        } catch (e) {
          errors.push({
            project,
            location,
            message: errorText(e),
            status: e instanceof ApiError ? e.status : undefined,
          });
        }
      });
      envs.sort((a, b) => a.project.localeCompare(b.project) || a.id.localeCompare(b.id));
      return { matched: matched.length, scanned: toScan.length, envs, errors };
    },
    [projectIds ?? [], pattern, locations],
    { execute: !!projectIds, keepPreviousData: true },
  );

  const foundProjects = Array.from(new Set((scan?.envs ?? []).map((e) => e.project)));
  const hardErrors = (scan?.errors ?? []).filter((e) => e.status !== 403 && e.status !== 404);
  const softErrors = (scan?.errors ?? []).length - hardErrors.length;
  const searchAsPattern = searchText.trim();

  const commonActions = (
    <>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {searchAsPattern && (
        <Action
          title={`Scan Projects Matching "${searchAsPattern}"`}
          icon={Icon.MagnifyingGlass}
          shortcut={hotkey(["cmd"], "s")}
          onAction={() => {
            setPattern(searchAsPattern);
            setSearchText("");
          }}
        />
      )}
      <Action
        title={showErrors ? "Hide Scan Errors" : "Show Scan Errors"}
        icon={Icon.Warning}
        onAction={() => setShowErrors((s) => !s)}
      />
    </>
  );

  return (
    <List
      isLoading={projectsLoading || scanning}
      filtering={{ keepSectionOrder: true }}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : `Discover · /${pattern}/`}
      searchBarPlaceholder="Filter results, or type a regex and press ⌘S to rescan"
      searchBarAccessory={
        <List.Dropdown tooltip="Region to scan" value={region} onChange={setRegion}>
          {GCP_REGIONS.map((r) => (
            <List.Dropdown.Item key={r.name} title={`${r.name} · ${r.description}`} value={r.name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title="Scan"
        subtitle={
          projectIds
            ? `${projectIds.length} visible projects · ${scan?.matched ?? "…"} match · ${scan?.scanned ?? "…"} scanned`
            : "listing projects (can take ~30s)…"
        }
      >
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={`Pattern /${pattern}/`}
          // always matches the typed text, so the rescan action stays reachable while filtering
          keywords={searchAsPattern ? [searchAsPattern] : undefined}
          subtitle={
            scan
              ? `${scan.envs.length} environments in ${foundProjects.length} projects · ${softErrors} projects without access/API`
              : "scanning…"
          }
          accessories={
            scan && scan.matched > MAX_PROJECTS
              ? [{ tag: { value: `capped at ${MAX_PROJECTS} projects`, color: Color.Orange } }]
              : []
          }
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      </List.Section>
      <List.Section title="Environments Found" subtitle={`${scan?.envs.length ?? 0}`}>
        {(scan?.envs ?? []).map((env) => {
          return (
            <List.Item
              key={envKey(env)}
              icon={{ source: Icon.Cloud, tintColor: tierColor(env) }}
              title={env.id}
              subtitle={env.project}
              keywords={[env.project, env.location]}
              accessories={[
                ...(env.project === current ? [{ tag: { value: "current project", color: Color.Green } }] : []),
                { tag: { value: tierLabel(env), color: tierColor(env) } },
                { text: `Airflow ${env.airflowVersion ?? "?"}` },
                { text: env.state },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Browse DAGs" icon={Icon.List} target={<DagList env={env} />} />
                  <Action.Push
                    title="Open Project in Composer"
                    icon={Icon.Folder}
                    onPush={() => setCurrentProject(env.project)}
                    target={<EnvironmentsList project={env.project} />}
                  />
                  {commonActions}
                  <Action.OpenInBrowser title="Open Airflow UI" url={env.airflowUri} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {(showErrors ? (scan?.errors ?? []) : hardErrors).length > 0 && (
        <List.Section title="Scan Errors">
          {(showErrors ? (scan?.errors ?? []) : hardErrors).map((e) => (
            <List.Item
              key={`${e.project}/${e.location}`}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title={e.project}
              subtitle={e.message}
              accessories={[{ text: e.location }]}
              actions={<ActionPanel>{commonActions}</ActionPanel>}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
