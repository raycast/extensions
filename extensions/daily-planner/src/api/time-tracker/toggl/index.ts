import { timeEntryIdStorage } from "..";
import { PreferenceError } from "../../../helpers/errors";
import { TimeEntry } from "../../../types";
import { extractSourceIdedTodIdOrIds } from "../../todo-source";
import { authFetch, CACHED_VALUE_ERROR, getWithDefaultWorkspaceId, getWithProjectId } from "../common";
import { refreshableMapStorage, refreshableStorage } from "../refreshableStorage";
import { TimeTracker } from "../types";
import { Me, Project, TimeEntry as TogglTimeEntry } from "./types";

const base64encode = (str: string) => Buffer.from(str).toString("base64");

export default function togglTimeTracker(apiToken: string): TimeTracker {
  const baseURL = "https://api.track.toggl.com/api/v9";
  const authHeader = { Authorization: `Basic ${base64encode(`${apiToken}:api_token`)}` };
  const api = authFetch(baseURL, authHeader, async (response) => {
    switch (response.status) {
      case 403:
        // Either `apiToken` is invalid, or the cached workspace ID is an invalid NUMBER. Likely the former.
        return new PreferenceError(
          'Please enter a valid Toggl API key from your Toggl Track Profile into the "Time Tracking App API Key" in Raycast Settings.',
          "extension",
          {
            title: "Toggle Track Profile",
            url: "https://track.toggl.com/profile",
          }
        );

      default: {
        const body = (await response.json()) as string;
        if (body === "Missing or invalid workspace_id") {
          // 400 Bad Request - workspace ID is blank or a string. Shouldn't happen unless storage was corrupted.
          const error = new Error("Cached workspace ID is no longer valid and has been cleared. Please try again.");
          error.name = CACHED_VALUE_ERROR;
          return error;
        }
        if (body === "User cannot access the selected project") {
          // 400 Bad Request - cached project ID no longer valid, project likely has been deleted.
          const error = new Error(
            "Project no longer available (likely deleted or renamed) in Toggl. Please try again to create a new project."
          );
          error.name = CACHED_VALUE_ERROR;
          return error;
        }
        return new Error(`${response.status} ${response.statusText}: ${body}`);
      }
    }
  });

  const userStorage = refreshableStorage<number>("toggl-me", async () => {
    const { default_workspace_id } = await api.get<Me>("/me");
    return default_workspace_id;
  });

  const projectStorage = refreshableMapStorage<Project["name"], Project["id"]>("toggl-projects", async () => {
    const workspaceId = await userStorage.get();
    const projects = await api.get<Project[]>(`/workspaces/${workspaceId}/projects`);
    return projects.map(({ id, name }) => [name, id]);
  });

  const withDefaultWorkspaceId = getWithDefaultWorkspaceId(userStorage);
  const withProjectId = getWithProjectId<Project>(projectStorage, (workspaceId, projectName) =>
    api.post<Project>(`/workspaces/${workspaceId}/projects`, {
      name: projectName,
      is_private: true,
      active: true,
    })
  );

  const toTimeEntry = ({ id, description, start, stop, workspace_id }: TogglTimeEntry): TimeEntry => ({
    id,
    title: description,
    start: new Date(start).getTime(),
    end: stop ? new Date(stop).getTime() : null,
    workspaceId: workspace_id,
  });

  return {
    async startTimer(url, { description, projectName, tagNames }) {
      // Lock in start timestamp before making project-related server calls.
      const start = new Date();
      return await withDefaultWorkspaceId(async (workspaceId) => {
        return await withProjectId(projectName, workspaceId, async (projectId) => {
          const timeEntry = await api.post<TogglTimeEntry>(`/workspaces/${workspaceId}/time_entries`, {
            created_with: "raycast-daily-planner",
            description,
            // For running entries should be -1 * (Unix start time). See https://developers.track.toggl.com/docs/tracking
            duration: Math.floor((-1 * start.getTime()) / 1000),
            project_id: projectId,
            start: start.toISOString(),
            tags: tagNames,
            workspace_id: workspaceId,
          });

          const sourceIdedTodoId = extractSourceIdedTodIdOrIds(url);
          if (typeof sourceIdedTodoId === "string") {
            // Store the new time entry's id only if it's not for a to-do, not a task block, since task blocks shouldn't
            // be updated or deleted when the tasks belonging to them are updated or deleted.
            await timeEntryIdStorage.append(sourceIdedTodoId, timeEntry.id.toString());
          }
          return toTimeEntry(timeEntry);
        });
      });
    },

    async stopTimer({ id, workspaceId }) {
      // `workspaceId` should be available. It is used instead of `withDefaultWorkspaceId` in case there is an existing
      // running timer that need to be stopped.
      if (!workspaceId) throw new Error("Toggl `workspaceId` unavailable in the given `TimeEntry` object.");
      await api.patch<TogglTimeEntry>(`/workspaces/${workspaceId}/time_entries/${id}/stop`, {});
    },

    async updateTimeEntries(sourceIdedTodoId, { description, projectName, tagNames }) {
      if (description === undefined && projectName === undefined && tagNames === undefined) {
        return;
      }
      const joinedTimeEntryIds = await timeEntryIdStorage.get(sourceIdedTodoId);
      if (!joinedTimeEntryIds) {
        return;
      }

      return await withDefaultWorkspaceId(async (workspaceId) => {
        return await withProjectId(projectName, workspaceId, async (projectId) => {
          const payload: { op: string; path: string; value: number | string | string[] | null }[] = [];
          if (description !== undefined) {
            payload.push({ op: "replace", path: "/description", value: description });
          }
          if (projectId !== undefined) {
            // If `projectName === ""`, `withProjectId` returns `null`.
            // op: "remove" fails with "500 Internal Server Error: Invalid path".
            payload.push({ op: "replace", path: "/project_id", value: projectId });
          }
          if (tagNames !== undefined) {
            payload.push({ op: "replace", path: "/tags", value: tagNames });
          }
          const result = await api.patch<{ success: number[]; failure: { id: number; message: string }[] }>(
            `/workspaces/${workspaceId}/time_entries/${joinedTimeEntryIds}`,
            payload
          );

          if (result.failure.length > 0) {
            // THIS API CALL SUCCEEDS EVEN WHEN THE TARGET IS A DELETED TIME ENTRY AND REVIVES THE TIME ENTRY.
            // The 'Time entry with ID: 000 was not found/is not accessible' message was obtained using a fake ID.
            const invalidIds = result.failure.reduce<string[]>(
              (invalidIds, { id, message }) =>
                message.startsWith("Time entry with ID") ? invalidIds.concat(id.toString()) : invalidIds,
              []
            );
            await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);
          }

          return result.success;
        });
      });
    },

    async deleteTimeEntries(sourceIdedTodoId) {
      const joinedTimeEntryIds = await timeEntryIdStorage.get(sourceIdedTodoId);
      if (!joinedTimeEntryIds || joinedTimeEntryIds.length === 0) {
        return [];
      }
      return await withDefaultWorkspaceId(async (workspaceId) => {
        const timeEntryIds = joinedTimeEntryIds.split(",");
        const results = await Promise.allSettled(
          timeEntryIds.map((id) => api.delete(`/workspaces/${workspaceId}/time_entries/${id}`))
        );
        const deletedEntryIds: string[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          // Failures are likely due to prior off-extension deletion (404 Not Found).
          if (result.status === "fulfilled") {
            deletedEntryIds.push(timeEntryIds[i]);
          }
        }

        await timeEntryIdStorage.remove(sourceIdedTodoId);

        return deletedEntryIds;
      });
    },

    async getTimeEntries({ from, to, description, runningTimerOnly }) {
      // `since` query parameter is used to fetch all entries including deleted ones. Deleted entries are proactively
      // removed from LocalStorage in order not to revive them on `updateTodoTimeEntries()` calls:
      // - Toggl's bulk edit PATCH API call succeeds even on deleted time entries, and undeletes them.
      // - To prevent the resurrections, it's either proactively remove deleted entry IDs here or make multiple API
      //   calls before sending a PATCH call in `updateTodoTimeEntries()`. The former leads to much fewer calls.
      // - `removeValuesAndExpiredKeys()` employs various guards to avoid unnecessary iterations.
      const params = from
        ? to
          ? `?start_date=${from.toISOString()}&end_date=${to.toISOString()}`
          : `?since=${Math.trunc(from.getTime() * 1e-3)}`
        : "";
      const timeEntries = runningTimerOnly
        ? [await api.get<TogglTimeEntry>(`/me/time_entries/current`)]
        : await api.get<TogglTimeEntry[]>(`/me/time_entries${params}`);

      const validTimeEntries: TimeEntry[] = [];
      const deletedTimeEntryIds: string[] = [];
      for (const entry of timeEntries) {
        if (!entry.server_deleted_at) {
          // `null` is a valid `description` value.
          if (description === undefined || entry.description === description) {
            validTimeEntries.push(toTimeEntry(entry));
          }
        } else {
          deletedTimeEntryIds.push(entry.id.toString());
        }
      }

      await timeEntryIdStorage.removeValuesAndExpiredKeys(deletedTimeEntryIds);

      return validTimeEntries;
    },
  };
}
