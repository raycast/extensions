import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";

import type {
  ProjectConfig,
  ProjectGroup,
  SelectableProjectScope,
} from "./types";

const PROJECTS_KEY = "firebase-remote-config-admin.projects";
const GROUPS_KEY = "firebase-remote-config-admin.groups";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

function normalizeProject(
  project: ProjectConfig | null | undefined,
): ProjectConfig {
  const sourceProject =
    typeof project === "object" && project !== null
      ? project
      : ({} as ProjectConfig);
  const projectId =
    typeof sourceProject.projectId === "string"
      ? sourceProject.projectId.trim()
      : "";
  const displayName =
    typeof sourceProject.displayName === "string"
      ? sourceProject.displayName.trim()
      : "";
  const credentialRef =
    typeof sourceProject.credentialRef === "string"
      ? sourceProject.credentialRef.trim()
      : "";
  const tags = Array.isArray(sourceProject.tags) ? sourceProject.tags : [];

  return {
    id:
      typeof sourceProject.id === "string" && sourceProject.id
        ? sourceProject.id
        : randomUUID(),
    projectId,
    displayName: displayName || projectId,
    credentialRef: credentialRef || undefined,
    tags: [
      ...new Set(
        tags
          .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
          .filter(Boolean),
      ),
    ],
    enabled: sourceProject.enabled ?? true,
    source: sourceProject.source ?? "manual",
  };
}

function normalizeGroup(group: ProjectGroup | null | undefined): ProjectGroup {
  const sourceGroup =
    typeof group === "object" && group !== null ? group : ({} as ProjectGroup);
  const name =
    typeof sourceGroup.name === "string" ? sourceGroup.name.trim() : "";
  const projectIds = Array.isArray(sourceGroup.projectIds)
    ? sourceGroup.projectIds
    : [];

  return {
    id:
      typeof sourceGroup.id === "string" && sourceGroup.id
        ? sourceGroup.id
        : randomUUID(),
    name,
    projectIds: [
      ...new Set(
        projectIds
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter(Boolean),
      ),
    ],
  };
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function clearLocalData(): Promise<void> {
  await LocalStorage.removeItem(PROJECTS_KEY);
  await LocalStorage.removeItem(GROUPS_KEY);
}

export async function getProjects(): Promise<ProjectConfig[]> {
  const projects = await readJson<unknown[]>(PROJECTS_KEY, []);
  const normalizedProjects = Array.isArray(projects)
    ? projects.map((project) => normalizeProject(project as ProjectConfig))
    : [];
  return normalizedProjects.sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

export async function saveProjects(projects: ProjectConfig[]): Promise<void> {
  await writeJson(PROJECTS_KEY, projects.map(normalizeProject));
}

export async function upsertProject(
  project: ProjectConfig,
): Promise<ProjectConfig> {
  const projects = await getProjects();
  const normalized = normalizeProject(project);
  const nextProjects = projects.filter((entry) => entry.id !== normalized.id);
  nextProjects.push(normalized);
  await saveProjects(nextProjects);
  return normalized;
}

export async function mergeImportedProjects(
  imported: Array<{ projectId: string; displayName: string }>,
): Promise<{ added: number; updated: number; projects: ProjectConfig[] }> {
  const existing = await getProjects();
  let added = 0;
  let updated = 0;

  const nextProjects = [...existing];

  for (const importedProject of imported) {
    const index = nextProjects.findIndex(
      (project) => project.projectId === importedProject.projectId,
    );
    if (index === -1) {
      nextProjects.push(
        normalizeProject({
          id: "",
          projectId: importedProject.projectId,
          displayName: importedProject.displayName,
          tags: [],
          enabled: true,
          source: "google-import",
        }),
      );
      added += 1;
      continue;
    }

    const previous = nextProjects[index];
    const next = normalizeProject({
      ...previous,
      displayName: previous.displayName || importedProject.displayName,
      source: previous.source ?? "google-import",
      enabled: previous.enabled,
    });

    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      nextProjects[index] = next;
      updated += 1;
    }
  }

  await saveProjects(nextProjects);
  return { added, updated, projects: nextProjects };
}

export async function deleteProject(projectId: string): Promise<void> {
  const projects = await getProjects();
  await saveProjects(projects.filter((project) => project.id !== projectId));

  const groups = await getGroups();
  await saveGroups(
    groups.map((group) => ({
      ...group,
      projectIds: group.projectIds.filter((id) => id !== projectId),
    })),
  );
}

export async function getGroups(): Promise<ProjectGroup[]> {
  const groups = await readJson<unknown[]>(GROUPS_KEY, []);
  const normalizedGroups = Array.isArray(groups)
    ? groups.map((group) => normalizeGroup(group as ProjectGroup))
    : [];
  return normalizedGroups.sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function saveGroups(groups: ProjectGroup[]): Promise<void> {
  await writeJson(GROUPS_KEY, groups.map(normalizeGroup));
}

export async function upsertGroup(group: ProjectGroup): Promise<ProjectGroup> {
  const groups = await getGroups();
  const normalized = normalizeGroup(group);
  const nextGroups = groups.filter((entry) => entry.id !== normalized.id);
  nextGroups.push(normalized);
  await saveGroups(nextGroups);
  return normalized;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await getGroups();
  await saveGroups(groups.filter((group) => group.id !== groupId));
}

export async function resolveProjects(
  scope?: SelectableProjectScope,
): Promise<ProjectConfig[]> {
  const projects = (await getProjects()).filter((project) => project.enabled);
  if (
    !scope?.groupId &&
    (!scope?.projectIds || scope.projectIds.length === 0)
  ) {
    return projects;
  }

  const selectedIds = new Set<string>();

  if (scope.groupId) {
    const group = (await getGroups()).find(
      (entry) => entry.id === scope.groupId,
    );
    for (const projectId of group?.projectIds ?? []) {
      selectedIds.add(projectId);
    }
  }

  for (const projectId of scope.projectIds ?? []) {
    selectedIds.add(projectId);
  }

  return projects.filter((project) => selectedIds.has(project.id));
}

export async function resolveProjectsForTool(input?: {
  groupName?: string;
  groupId?: string;
  projectIds?: string[];
  projectRefs?: string[];
}): Promise<ProjectConfig[]> {
  const projects = (await getProjects()).filter((project) => project.enabled);
  const groups = await getGroups();

  if (!input) return projects;
  const hasScopeFilter =
    Boolean(input.groupId) ||
    Boolean(input.groupName?.trim()) ||
    (input.projectIds?.length ?? 0) > 0 ||
    (input.projectRefs?.length ?? 0) > 0;
  if (!hasScopeFilter) return projects;

  const resolved = new Set<string>();
  if (input.groupId) {
    const group = groups.find((entry) => entry.id === input.groupId);
    for (const projectId of group?.projectIds ?? []) resolved.add(projectId);
  }
  if (input.groupName) {
    const group = groups.find(
      (entry) => entry.name.toLowerCase() === input.groupName?.toLowerCase(),
    );
    for (const projectId of group?.projectIds ?? []) resolved.add(projectId);
  }
  for (const ref of input.projectIds ?? []) {
    const project = projects.find(
      (entry) => entry.id === ref || entry.projectId === ref,
    );
    if (project) resolved.add(project.id);
  }
  for (const ref of input.projectRefs ?? []) {
    const normalized = ref.toLowerCase();
    const project = projects.find(
      (entry) =>
        entry.id === ref ||
        entry.projectId === ref ||
        entry.displayName.toLowerCase() === normalized,
    );
    if (project) resolved.add(project.id);
  }

  if (resolved.size === 0) return [];
  return projects.filter((project) => resolved.has(project.id));
}

export async function findProjectByReference(
  reference: string,
): Promise<ProjectConfig | undefined> {
  const normalized = reference.trim().toLowerCase();
  const projects = await getProjects();
  return projects.find(
    (project) =>
      project.id === reference ||
      project.projectId === reference ||
      project.displayName.toLowerCase() === normalized,
  );
}
