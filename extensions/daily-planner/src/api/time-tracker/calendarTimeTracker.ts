import { STORAGE_DAYS } from ".";
import { deleteBlocks, startTimer, updateEventEndDate, updateBlockTitles } from "../eventkit";
import { getURLs } from "../todo-source";
import { TimeTracker } from "./types";

function retentionPeriod() {
  const now = new Date();
  const end = now.getTime();
  const start = now.setDate(now.getDate() - STORAGE_DAYS);
  return { start, end };
}

export default function calendarTimeTracker(calendarName: string): TimeTracker {
  return {
    async startTimer(url, { description }) {
      if (!url) {
        throw new Error("Unable to start timer: `url` missing");
      }

      const title = description ?? "Untitled";
      const start = new Date();
      const calItemId = await startTimer(title, url, start, calendarName);
      return {
        id: calItemId,
        title,
        start: start.getTime(),
        end: null,
      };
    },

    async stopTimer({ id }) {
      const end = new Date();
      await updateEventEndDate(id.toString(), end);
    },

    async updateTimeEntries(sourceIdedTodoId, { description }) {
      if (!description) {
        // `projectName` and `tagNames` updates are not applicable to calendarTimeTracker.
        return;
      }

      const urls = getURLs(sourceIdedTodoId);
      return await updateBlockTitles(description, urls, calendarName, retentionPeriod());
    },

    async deleteTimeEntries(sourceIdedTodoId) {
      const urls = getURLs(sourceIdedTodoId);
      return await deleteBlocks(urls, calendarName, retentionPeriod());
    },
  };
}
