import { timeEntryIdStorage } from "..";
import { PreferenceError } from "../../../helpers/errors";
import { TimeEntry } from "../../../types";
import { extractSourceIdedTodIdOrIds } from "../../todo-source";
import { authFetch, CACHED_VALUE_ERROR, getWithDefaultWorkspaceId, getWithProjectIdAndTagIds } from "../common";
import { refreshableMapStorage, refreshableStorage } from "../refreshableStorage";
import { TimeTracker } from "../types";
import { Project, Tag, TimeEntry as ClockifyTimeEntry, User } from "./types";

export default function clockifyTimeTracker(apiKey: string): TimeTracker {
  const baseURL = "https://api.clockify.me/api/v1";
  const authHeader = { "X-Api-Key": apiKey };
  const api = authFetch(baseURL, authHeader, async (response) => {
    switch (response.status) {
      case 401:
        return new PreferenceError(
          'Please enter a valid Clockify API key from your Clockify Profile Settings into the "Time Tracking App API Key" in Raycast Settings.',
          "extension",
          {
            title: "Clockify Profile Settings",
            url: "https://app.clockify.me/user/settings",
          }
        );

      case 403: {
        const error = new Error("Cached workspace ID is no longer valid and has been cleared. Please try again.");
        error.name = CACHED_VALUE_ERROR;
        return error;
      }
      default: {
        const { message, code } = (await response.json()) as { message: string; code: number };
        if (code === 501) {
          if (message.startsWith("TIMEENTRY")) {
            // Do not change the message since the failed TIMEENTRY id should be passed to `updateTodoTimeEntries`.
            const error = new Error(message);
            error.name = CACHED_VALUE_ERROR;
            return error;
          } else if (message.startsWith("PROJECT") || message.startsWith("TAG")) {
            // "PROJECT with id xxx doesn't belong to WORKSPACE with id xxx"
            // "TAG with id xxx doesn't belong to WORKSPACE with id xxx"
            // When both the project and some of the tags are invalid, only the "PROJECT" error message is returned.
            const allCapsErrorParam = message.slice(0, message.indexOf(" "));
            const errorParam = allCapsErrorParam.charAt(0) + allCapsErrorParam.slice(1).toLowerCase();
            const error = new Error(
              `${errorParam} no longer available (likely deleted or renamed) in Clockify. Please try again to create a new ${errorParam.toLowerCase()}.`
            );
            error.name = CACHED_VALUE_ERROR;
            return error;
          }
        }
        // Format error for Toast, e.g., "400 Bad Request: All time entries must have end time defined ... (code 501)"
        return new Error(`${response.status} ${response.statusText}: ${message} (code ${code})`);
      }
    }
  });

  const userStorage = refreshableStorage<{ defaultWorkspace: string; id: string }>("clockify-user", async () => {
    const { defaultWorkspace, id } = await api.get<User>("/user");
    return { defaultWorkspace, id };
  });

  const projectStorage = refreshableMapStorage<Project["name"], Project["id"]>("clockify-projects", async () => {
    const { defaultWorkspace } = await userStorage.get();
    const projects = await api.get<Project[]>(`/workspaces/${defaultWorkspace}/projects`);
    return projects.map(({ id, name }) => [name, id]);
  });

  const tagStorage = refreshableMapStorage<Tag["name"], Tag["id"]>("clockify-tags", async () => {
    const { defaultWorkspace } = await userStorage.get();
    const tags = await api.get<Tag[]>(`/workspaces/${defaultWorkspace}/tags`);
    return tags.map(({ id, name }) => [name, id]);
  });

  const withDefaultWorkspaceId = getWithDefaultWorkspaceId(userStorage);
  const withProjectIdAndTagIds = getWithProjectIdAndTagIds(
    projectStorage,
    tagStorage,
    (workspaceId, projectName) =>
      api.post<Project>(`/workspaces/${workspaceId}/projects`, {
        name: projectName,
        isPublic: false,
        public: false, // this one doesn't seem to work
      }),
    (workspaceId, tagName) =>
      api.post<Tag>(`/workspaces/${workspaceId}/tags`, {
        name: tagName,
      })
  );

  const toTimeEntry = ({ id, description, timeInterval: { start, end }, userId, workspaceId }: ClockifyTimeEntry) => ({
    id,
    title: description,
    start: new Date(start).getTime(),
    end: end ? new Date(end).getTime() : null,
    userId,
    workspaceId,
  });

  return {
    async startTimer(url, { description, projectName, tagNames }) {
      // Lock in start timestamp before making project-related server calls.
      const start = new Date();
      return await withDefaultWorkspaceId(async (workspaceId) => {
        return await withProjectIdAndTagIds(projectName, tagNames, workspaceId, async (projectId, tagIds) => {
          const timeEntry = await api.post<ClockifyTimeEntry>(`/workspaces/${workspaceId}/time-entries`, {
            description,
            projectId,
            start: start.toISOString(),
            tagIds,
          });

          const sourceIdedTodoId = extractSourceIdedTodIdOrIds(url);
          if (typeof sourceIdedTodoId === "string") {
            // Store the new time entry's id only if it's not for a to-do, not a task block, since task blocks shouldn't
            // be updated or deleted when the tasks belonging to them are updated or deleted.
            await timeEntryIdStorage.append(sourceIdedTodoId, timeEntry.id);
          }
          return toTimeEntry(timeEntry);
        });
      });
    },

    async stopTimer({ workspaceId, userId }) {
      // `workspaceId` and `userId` should be available. They are used instead of `withDefaultWorkspaceId` in case there
      // is an existing running timer that need to be stopped.
      if (!workspaceId) throw new Error("Clockify `workspaceId` unavailable in the given `TimeEntry` object.");
      if (!userId) throw new Error("Clockify `userId` unavailable in the given `TimeEntry` object.");
      await api.patch<ClockifyTimeEntry>(`/workspaces/${workspaceId}/user/${userId}/time-entries`, {
        // `end` is required (not mentioned in documentaion)
        end: new Date().toISOString(),
      });
      // Remove expired items here since `stopTimer()` is the least time-sensitive operation.
      await timeEntryIdStorage.removeValuesAndExpiredKeys([]);
    },

    async updateTimeEntries(sourceIdedTodoId, { description, projectName, tagNames }) {
      const joinedTimeEntryIds = await timeEntryIdStorage.get(sourceIdedTodoId);
      if (!joinedTimeEntryIds || joinedTimeEntryIds.length === 0) {
        return;
      }
      return withDefaultWorkspaceId(async (workspaceId: string, userId: string | undefined) => {
        return withProjectIdAndTagIds(projectName, tagNames, workspaceId, async (projectId, tagIds) => {
          // `userId` should be available.
          if (!userId) throw new Error("Clockify `userId` unavailable in storage.");
          const timeEntryIds = joinedTimeEntryIds.split(",");
          // Time entries need to be fetched first since Clockify's PUT bulk edit API requires all parameter values.
          // Clockify web app uses PATCH (`/workspaces/${workspaceId}/timeEntries/bulk`), but this isn't documented,
          // and returns 404 Not Found when called.
          // Fetching is done by ID despite the "Too many requests" risk since description-based edit is risky: once
          // either the todo title or time entry description is changed off-extension, they can never be re-associated.
          const timeEntryFetchResults = await Promise.allSettled(
            timeEntryIds.map((id) => api.get<ClockifyTimeEntry>(`/workspaces/${workspaceId}/time-entries/${id}`))
          );

          // Running time entry should be updated separately since Clockify's bulk edit API rejects `null` for `end`.
          let runningTimeEntry: ClockifyTimeEntry | undefined = undefined;
          const bulkEditTimeEntries: ClockifyTimeEntry[] = [];
          const invalidIds: ClockifyTimeEntry["id"][] = [];
          for (let i = 0; i < timeEntryFetchResults.length; i++) {
            const result = timeEntryFetchResults[i];
            if (result.status === "fulfilled") {
              if (!result.value.timeInterval.end) {
                runningTimeEntry = result.value;
              } else {
                bulkEditTimeEntries.push(result.value);
              }
            } else {
              // result.status === "rejected"
              if (result.reason instanceof Error && result.reason.name === CACHED_VALUE_ERROR) {
                // Time entries may have been deleted, or time entry descriptions may have been edited.
                invalidIds.push(timeEntryIds[i]);
              } else {
                // If there are multiple failures, only the first error will be thrown. Haven't seen any failure cases
                // other than the TIMEENTRY id error.
                await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);
                throw result.reason;
              }
            }
          }

          if (!runningTimeEntry && bulkEditTimeEntries.length === 0) {
            await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);
            return;
          }

          const toPayload = (entry: ClockifyTimeEntry) => ({
            billable: entry.billable,
            description: description ?? entry.description,
            end: entry.timeInterval.end,
            id: entry.id,
            projectId: projectId !== undefined ? projectId : entry.projectId,
            start: entry.timeInterval.start,
            tagIds: tagIds ?? entry.tagIds,
            taskId: entry.taskId,
          });
          // If deleted time entries are included in the bulk PUT request, it fails with the same 400 Bad Request error.
          // (code 501, "TIMEENTRY with id ...") None of the entries are updated. Chances of some entries getting
          // deleted between the GET call above and the PUT call below are low, but to mitigate the risk further:
          // - `timeEntryIdStorage.remove()` isn't called in between and will be called afterwards.
          // - `Promise.allSettled()` will be used and failure cases will be examined just in case, to delete at least
          //   one error-causing timeEntryId out of potentially many.
          // - A `for` loop instead of `timeEntryFetchResults.reduce()` for marginally better performance.
          const timeEntryUpdateResults = await Promise.allSettled([
            runningTimeEntry
              ? api.put<ClockifyTimeEntry>(
                  `/workspaces/${workspaceId}/time-entries/${runningTimeEntry.id}`,
                  toPayload(runningTimeEntry)
                )
              : Promise.resolve(undefined),

            bulkEditTimeEntries.length > 0
              ? api.put<ClockifyTimeEntry[]>(
                  `/workspaces/${workspaceId}/user/${userId}/time-entries`,
                  bulkEditTimeEntries.map(toPayload)
                )
              : Promise.resolve(undefined),
          ]);

          const updatedEntryIds: string[] = [];
          for (let i = 0; i < timeEntryUpdateResults.length; i++) {
            const result = timeEntryUpdateResults[i];
            switch (result.status) {
              case "fulfilled": {
                const updatedTimeEntryOrEntries = result.value;
                if (updatedTimeEntryOrEntries) {
                  if (!Array.isArray(updatedTimeEntryOrEntries)) {
                    updatedEntryIds.push(updatedTimeEntryOrEntries.id);
                  } else {
                    updatedEntryIds.push(...updatedTimeEntryOrEntries.map(({ id }) => id));
                  }
                }
                break;
              }
              case "rejected":
                if (
                  result.reason instanceof Error &&
                  result.reason.name === CACHED_VALUE_ERROR &&
                  result.reason.message.startsWith("TIMEENTRY")
                ) {
                  const invalidId = result.reason.message.split(" ")[3];
                  invalidIds.push(invalidId);
                  await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);
                  throw new Error(
                    i === 0
                      ? "Failed to update running Clockify time entry. It could have been deleted recently."
                      : `Failed to update ${bulkEditTimeEntries.length} Clockify time entries. An unavailable time entry ID has been removed from cache. Please try again.`
                  );
                } else {
                  // If it was a project ID or tag ID error, `withProjectIdAndTagIds()` should deal with it.
                  // In the unlikely event that both requests failed, only the first error will be thrown. Freaking Clockify.
                  await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);
                  throw result.reason;
                }
            }
          }

          await timeEntryIdStorage.remove(sourceIdedTodoId, invalidIds);

          return updatedEntryIds;
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
          timeEntryIds.map((id) => api.delete(`/workspaces/${workspaceId}/time-entries/${id}`))
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
      return await withDefaultWorkspaceId(async (workspaceId: string, userId: string | undefined) => {
        if (!userId) throw new Error("Clockify `userId` unavailable in storage.");
        const params: string[] = [];
        if (description) {
          params.push(`description=${description}`);
        }
        if (runningTimerOnly) {
          params.push("in-progress=true");
        } else if (from && to) {
          params.push(`start=${from.toISOString()}&end=${to.toISOString()}`);
        }
        const timeEntries = await api.get<ClockifyTimeEntry[]>(
          `/workspaces/${workspaceId}/user/${userId}/time-entries?${params.join("&")}`
        );

        return timeEntries.map<TimeEntry>((entry) => toTimeEntry(entry));
      });
    },
  };
}
