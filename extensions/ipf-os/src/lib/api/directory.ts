import { LocalStorage } from "@raycast/api";

import type { Department, DirectoryUser, Project, Sprint } from "../domain/ticket";
import { ApiError, requestAll, requestOne } from "./client";

const CACHE_KEY = "ipfos.directory.cache";
const CACHE_TTL_MS = 60 * 60 * 1000;

interface RawUser {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface RawDepartment {
  id: string;
  name: string;
  code: string | null;
}

interface RawProject {
  id: string;
  projectName: string;
}

interface RawSprint {
  id: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  goal: string | null;
  status: string;
}

export interface Directory {
  users: DirectoryUser[];
  departments: Department[];
}

interface CachedDirectory extends Directory {
  fetchedAt: number;
}

const toDirectoryUser = (raw: RawUser): DirectoryUser => {
  const composed = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
  return {
    id: raw.id,
    email: raw.email,
    displayName: raw.displayName?.trim() || composed || raw.email,
  };
};

const emptyOnForbidden = async <T>(load: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return [];
    throw error;
  }
};

async function fetchDirectory(): Promise<Directory> {
  const [users, departments] = await Promise.all([
    emptyOnForbidden(() => requestAll<RawUser>({ path: "/users" })),
    emptyOnForbidden(() => requestAll<RawDepartment>({ path: "/departments" })),
  ]);

  return {
    users: users.map(toDirectoryUser),
    departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
  };
}

export async function getDirectory(forceRefresh = false): Promise<Directory> {
  if (!forceRefresh) {
    const raw = await LocalStorage.getItem<string>(CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CachedDirectory;
        if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          return { users: cached.users, departments: cached.departments };
        }
      } catch {
        await LocalStorage.removeItem(CACHE_KEY);
      }
    }
  }

  const directory = await fetchDirectory();
  const payload: CachedDirectory = { ...directory, fetchedAt: Date.now() };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  return directory;
}

export async function listProjects(): Promise<Project[]> {
  const projects = await emptyOnForbidden(() => requestAll<RawProject>({ path: "/projects" }));
  return projects.map((p) => ({ id: p.id, name: p.projectName }));
}

export async function listSprints(projectId: string): Promise<Sprint[]> {
  const sprints = await emptyOnForbidden(async () =>
    requestOne<RawSprint[]>({ path: `/projects/${projectId}/sprints` }),
  );

  return sprints
    .filter((s) => s.status === "OPEN")
    .map((s) => ({
      id: s.id,
      projectId: s.projectId,
      label: s.goal?.trim() || `Week ${s.isoWeek}, ${s.isoYear}`,
      status: s.status,
    }));
}

export interface DirectoryLookup {
  userName: (userId: string | null | undefined) => string;
  departmentName: (departmentId: string | null | undefined) => string;
  users: DirectoryUser[];
  departments: Department[];
}

export function createLookup(directory: Directory | undefined): DirectoryLookup {
  const users = directory?.users ?? [];
  const departments = directory?.departments ?? [];

  const userById = new Map(users.map((u) => [u.id, u]));
  const departmentById = new Map(departments.map((d) => [d.id, d]));

  const shorten = (id: string) => `${id.slice(0, 8)}…`;

  return {
    users,
    departments,
    userName: (userId) => {
      if (!userId) return "Unassigned";
      return userById.get(userId)?.displayName ?? shorten(userId);
    },
    departmentName: (departmentId) => {
      if (!departmentId) return "No department";
      return departmentById.get(departmentId)?.name ?? shorten(departmentId);
    },
  };
}
