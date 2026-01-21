import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __resetMockStorage, LocalStorage } from "@/__mocks__/@raycast/api";
import { Worklog } from "@/types/models";
import { clearWorklogs, deleteWorklog, getWorklogs, saveWorklog } from "./storage";

const WORKLOGS_KEY = "jira-worklogs-local";

const createWorklog = (overrides: Partial<Worklog> = {}): Worklog => ({
  id: "test-id-1",
  taskId: "PROJ-123",
  description: "Test worklog",
  startTime: "2026-01-18T09:00:00.000Z",
  endTime: "2026-01-18T10:00:00.000Z",
  durationSeconds: 3600,
  ...overrides,
});

describe("storage", () => {
  beforeEach(() => {
    __resetMockStorage();
  });

  afterEach(() => {
    __resetMockStorage();
  });

  describe("getWorklogs", () => {
    it("returns empty array when no data exists", async () => {
      const result = await getWorklogs();
      expect(result).toEqual([]);
    });

    it("parses and returns stored worklogs", async () => {
      const worklogs = [createWorklog()];
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(worklogs));

      const result = await getWorklogs();
      expect(result).toEqual(worklogs);
    });

    it("returns multiple worklogs", async () => {
      const worklogs = [createWorklog({ id: "1" }), createWorklog({ id: "2", taskId: "PROJ-456" })];
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(worklogs));

      const result = await getWorklogs();
      expect(result).toHaveLength(2);
    });
  });

  describe("saveWorklog", () => {
    it("adds new worklog to empty storage", async () => {
      const worklog = createWorklog();

      await saveWorklog(worklog);

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(worklog);
    });

    it("adds new worklog to existing worklogs", async () => {
      const existing = [createWorklog({ id: "existing" })];
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(existing));

      const newWorklog = createWorklog({ id: "new", taskId: "PROJ-999" });
      await saveWorklog(newWorklog);

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(2);
    });

    it("updates existing worklog by id", async () => {
      const worklog = createWorklog();
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify([worklog]));

      const updated = { ...worklog, description: "Updated description" };
      await saveWorklog(updated);

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(1);
      expect(stored[0].description).toBe("Updated description");
    });

    it("throws error when trying to add second in-progress worklog", async () => {
      const inProgress = createWorklog({ id: "1", endTime: undefined });
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify([inProgress]));

      const anotherInProgress = createWorklog({ id: "2", taskId: "PROJ-456", endTime: undefined });

      await expect(saveWorklog(anotherInProgress)).rejects.toThrow(
        'Another worklog for "PROJ-123" is already in progress.',
      );
    });

    it("allows updating the same in-progress worklog", async () => {
      const inProgress = createWorklog({ id: "1", endTime: undefined });
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify([inProgress]));

      const updated = { ...inProgress, description: "Updated" };
      await saveWorklog(updated);

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(1);
      expect(stored[0].description).toBe("Updated");
    });

    it("allows adding completed worklog when another is in progress", async () => {
      const inProgress = createWorklog({ id: "1", endTime: undefined });
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify([inProgress]));

      const completed = createWorklog({ id: "2", taskId: "PROJ-456" });
      await saveWorklog(completed);

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(2);
    });
  });

  describe("deleteWorklog", () => {
    it("removes worklog by id", async () => {
      const worklogs = [createWorklog({ id: "1" }), createWorklog({ id: "2" })];
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(worklogs));

      await deleteWorklog("1");

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe("2");
    });

    it("handles deletion of non-existent id gracefully", async () => {
      const worklogs = [createWorklog({ id: "1" })];
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(worklogs));

      await deleteWorklog("non-existent");

      const stored = JSON.parse((await LocalStorage.getItem(WORKLOGS_KEY)) as string);
      expect(stored).toHaveLength(1);
    });
  });

  describe("clearWorklogs", () => {
    it("removes all worklogs", async () => {
      await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify([createWorklog()]));

      await clearWorklogs();

      const stored = await LocalStorage.getItem(WORKLOGS_KEY);
      expect(stored).toBeUndefined();
    });
  });
});
