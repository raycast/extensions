import fetch, { Response } from "node-fetch";
import { TimeEntryIdType } from "../../types";
import { Project as ClockifyProject, Tag as ClockifyTag } from "./clockify/types";
import { RefreshableMapStorage, RefreshableStorage } from "./refreshableStorage";
import { Project as TogglProject } from "./toggl/types";

export const CACHED_VALUE_ERROR = "CachedValueError";

export function authFetch(
  baseURL: string,
  authHeader: Record<string, string>,
  getError: (reponse: Response) => Promise<Error>
) {
  const authFetchWithoutBody = (method: string) => {
    return async <T>(endpoint: string): Promise<T> => {
      const response = await fetch(baseURL + endpoint, {
        method,
        headers: authHeader,
      });
      if (!response.ok) {
        throw await getError(response);
      }
      return (method === "GET" ? await response.json() : undefined) as T;
    };
  };
  const authFetchWithBody = (method: string) => {
    return async <T>(endpoint: string, body: unknown): Promise<T> => {
      const response = await fetch(baseURL + endpoint, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw await getError(response);
      }
      return (await response.json()) as T;
    };
  };

  return {
    get: authFetchWithoutBody("GET"),
    post: authFetchWithBody("POST"),
    patch: authFetchWithBody("PATCH"),
    put: authFetchWithBody("PUT"),
    delete: authFetchWithoutBody("DELETE"),
  };
}

export function getWithDefaultWorkspaceId<T extends TimeEntryIdType>(
  storage: RefreshableStorage<T | { defaultWorkspace: T; id: T }>
) {
  return async <U>(fn: (workspaceId: T, userId?: T) => Promise<U>): Promise<U> => {
    const item = await storage.get();
    const workspaceId = typeof item === "object" ? item.defaultWorkspace : item;
    const userId = typeof item === "object" ? item.id : undefined;
    try {
      return await fn(workspaceId, userId);
    } catch (error) {
      if (error instanceof Error && error.name === CACHED_VALUE_ERROR) {
        // Remove Toggl user data from LocalStorage to trigger fetching next time.
        await storage.clear();
      }
      throw error;
    }
  };
}

export function getWithProjectId<T extends ClockifyProject | TogglProject>(
  storage: RefreshableMapStorage<T["name"], T["id"]>,
  fetch: (workspaceId: T["id"], projectName: T["name"]) => Promise<T>
) {
  return async <U>(
    projectName: string | undefined,
    workspaceId: T["id"],
    fn: (projectId: T["id"] | null | undefined) => Promise<U>
  ): Promise<U> => {
    if (projectName === undefined) {
      return await fn(undefined);
    }
    if (projectName === "") {
      return await fn(null);
    }
    // See if there's a project with the given name already.
    const projectId = await storage.get(projectName);
    if (projectId) {
      try {
        return await fn(projectId);
      } catch (error) {
        if (error instanceof Error && error.name === CACHED_VALUE_ERROR) {
          // Project deleted or renamed. Clear storage to trigger a refresh next time. It's better to give the user a
          // chance to manually synchronize the project names than to blindly create a new project on error.
          await storage.clear();
        }
        throw error;
      }
    }
    // Create a new project
    const project = await fetch(workspaceId, projectName);
    await storage.set(project.name, project.id);
    return await fn(project.id);
  };
}

export function getWithProjectIdAndTagIds(
  projectStorage: RefreshableMapStorage<ClockifyProject["name"], ClockifyProject["id"]>,
  tagStorage: RefreshableMapStorage<ClockifyTag["name"], ClockifyTag["id"]>,
  postProject: (workspaceId: string, projectName: ClockifyProject["name"]) => Promise<ClockifyProject>,
  postTag: (workspaceId: string, tagName: ClockifyTag["name"]) => Promise<ClockifyTag>
) {
  return async <U>(
    projectName: ClockifyProject["name"] | undefined,
    tagNames: ClockifyTag["name"][] | undefined,
    workspaceId: string,
    fn: (projectId: ClockifyProject["id"] | null | undefined, tagIds: ClockifyTag["id"][] | undefined) => Promise<U>
  ): Promise<U> => {
    const getProjectId = async () => {
      if (projectName === undefined) return undefined;
      if (projectName === "") return null;
      const projectId = await projectStorage.get(projectName);
      if (projectId) return projectId;
      const newProject = await postProject(workspaceId, projectName);
      await projectStorage.set(newProject.name, newProject.id);
      return newProject.id;
    };
    const getTagIds = async () => {
      // If `tagNames.length === 0`, an empty array should be returned so any existing tags are removed.
      if (!tagNames || tagNames.length === 0) return tagNames;
      const { values: tagIds, missingKeys: missingTagNames } = await tagStorage.getMany(tagNames);
      if (missingTagNames.length === 0) return tagIds;
      const newTags = await Promise.all(missingTagNames.map((tagName) => postTag(workspaceId, tagName)));
      const newTagNameIdPairs: [ClockifyTag["name"], ClockifyTag["id"]][] = [];
      for (const { name, id } of newTags) {
        newTagNameIdPairs.push([name, id]);
        tagIds.push(id);
      }
      await tagStorage.setMany(newTagNameIdPairs);
      return tagIds;
    };
    const [projectId, tagIds] = await Promise.all([getProjectId(), getTagIds()]);

    try {
      return await fn(projectId, tagIds);
    } catch (error) {
      if (error instanceof Error && error.name === CACHED_VALUE_ERROR) {
        // Project or some of the tags were deleted or renamed. Clear storage to trigger a refresh next time.
        if (error.message.startsWith("Project")) {
          await projectStorage.clear();
        } else if (error.message.startsWith("Tag")) {
          await tagStorage.clear();
        }
      }
      throw error;
    }
  };
}
