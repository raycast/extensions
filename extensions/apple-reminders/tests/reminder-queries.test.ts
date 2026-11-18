import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import getReminders from "../src/tools/get-reminders";
import getCompletedReminders from "../src/tools/get-completed-reminders";
// @ts-expect-error Mock module
import { reminderQueries, completedReminderQueries, resetMockState } from "./mocks/swift-reminders.mjs";

describe("Reminder query tools", () => {
  beforeEach(resetMockState);

  it("passes list and search filters to Swift for both completion states", async () => {
    const query = { listId: "work", searchText: "passport #travel" };
    assert.deepEqual(await getReminders(query), []);
    assert.deepEqual(await getCompletedReminders(query), []);
    assert.deepEqual(reminderQueries, [query]);
    assert.deepEqual(completedReminderQueries, [query]);
  });

  it("keeps unfiltered reads compatible", async () => {
    assert.deepEqual(await getReminders(), []);
    assert.deepEqual(await getCompletedReminders({}), []);
    assert.deepEqual(reminderQueries, [{ listId: undefined, searchText: undefined }]);
    assert.deepEqual(completedReminderQueries, [{ listId: undefined, searchText: undefined }]);
  });

  it("passes smart views through for filtering completed reminders before the cap", async () => {
    await getCompletedReminders({ listId: "today" });
    assert.deepEqual(completedReminderQueries, [{ listId: "today", searchText: undefined }]);
  });
});
