import * as assert from "node:assert";
import { beforeEach, describe, it } from "node:test";

import {
  applyTagsToNotes,
  extractTagsFromNotes,
  extractTagsFromText,
  formatTags,
  parseTags,
} from "../src/helpers";
import { parseAIResponse, resolveQuickAddReminder } from "../src/quick-add-reminder-parser";
import createReminderTool from "../src/tools/create-reminder";
import updateReminderTool from "../src/tools/update-reminder";
// @ts-expect-error Mock module
import { createdReminders, resetMockState, updatedReminders } from "./mocks/swift-reminders.mjs";

describe("Tag Helpers", () => {
  it("parses empty, null, or undefined tags", () => {
    assert.deepStrictEqual(parseTags(), []);
    assert.deepStrictEqual(parseTags(""), []);
    assert.deepStrictEqual(parseTags([]), []);
  });

  it("parses single tag with or without #", () => {
    assert.deepStrictEqual(parseTags("work"), ["work"]);
    assert.deepStrictEqual(parseTags("#work"), ["work"]);
    assert.deepStrictEqual(parseTags(["work"]), ["work"]);
    assert.deepStrictEqual(parseTags(["#work"]), ["work"]);
  });

  it("parses multiple tags from comma-separated, space-separated, or array inputs", () => {
    assert.deepStrictEqual(parseTags("work, urgent"), ["work", "urgent"]);
    assert.deepStrictEqual(parseTags("#work #urgent"), ["work", "urgent"]);
    assert.deepStrictEqual(parseTags(["#work", "urgent", "#personal"]), ["work", "urgent", "personal"]);
    assert.deepStrictEqual(parseTags("#work, #urgent, work"), ["work", "urgent"]); // removes duplicates
  });

  it("formats tags in Apple Reminders native hashtag format", () => {
    assert.strictEqual(formatTags(), "");
    assert.strictEqual(formatTags([]), "");
    assert.strictEqual(formatTags("work"), "#work");
    assert.strictEqual(formatTags(["work", "urgent"]), "#work #urgent");
    assert.strictEqual(formatTags("#work #urgent"), "#work #urgent");
  });

  it("extracts existing tags from notes and cleans note body", () => {
    assert.deepStrictEqual(extractTagsFromNotes(undefined), { notes: "", tags: [] });
    assert.deepStrictEqual(extractTagsFromNotes(""), { notes: "", tags: [] });
    assert.deepStrictEqual(extractTagsFromNotes("Just regular notes"), { notes: "Just regular notes", tags: [] });
    assert.deepStrictEqual(extractTagsFromNotes("#work #urgent"), { notes: "", tags: ["work", "urgent"] });
    assert.deepStrictEqual(extractTagsFromNotes("Meeting notes\n\n#work #urgent"), {
      notes: "Meeting notes",
      tags: ["work", "urgent"],
    });
  });

  it("applies tags to notes preserving existing notes or replacing existing tags cleanly", () => {
    assert.strictEqual(applyTagsToNotes(undefined, "work"), "#work");
    assert.strictEqual(applyTagsToNotes("", "work"), "#work");
    assert.strictEqual(applyTagsToNotes("Important task", ["work", "urgent"]), "Important task\n\n#work #urgent");
    assert.strictEqual(applyTagsToNotes("Important task\n\n#old", ["work", "urgent"]), "Important task\n\n#work #urgent");
    assert.strictEqual(applyTagsToNotes("Important task\n\n#old", ""), "Important task");
    assert.strictEqual(applyTagsToNotes("#old", ""), undefined);
    assert.strictEqual(applyTagsToNotes("Existing notes", undefined), "Existing notes");
  });

  it("extracts tags from text and cleans title", () => {
    const result = extractTagsFromText("Buy groceries #errands #groceries");
    assert.strictEqual(result.title, "Buy groceries");
    assert.deepStrictEqual(result.tags, ["errands", "groceries"]);
  });

  it("preserves quoted hashtags in title without extracting them as tags", () => {
    const result = extractTagsFromText('Post about "#launch" and "#announcement"');
    assert.strictEqual(result.title, 'Post about "#launch" and "#announcement"');
    assert.deepStrictEqual(result.tags, []);

    const mixedResult = extractTagsFromText('Post about "#launch" #marketing #urgent');
    assert.strictEqual(mixedResult.title, 'Post about "#launch"');
    assert.deepStrictEqual(mixedResult.tags, ["marketing", "urgent"]);
  });

  it("does not treat words with apostrophes or contractions as quoted spans", () => {
    const result = extractTagsFromText("Buy John's task #work don't forget");
    assert.strictEqual(result.title, "Buy John's task don't forget");
    assert.deepStrictEqual(result.tags, ["work"]);
  });

  it("extracts comma-separated tags from text without leaving trailing tags or commas in title", () => {
    const result1 = extractTagsFromText("Buy milk #work,#urgent");
    assert.strictEqual(result1.title, "Buy milk");
    assert.deepStrictEqual(result1.tags, ["work", "urgent"]);

    const result2 = extractTagsFromText("Buy milk #work, #urgent");
    assert.strictEqual(result2.title, "Buy milk");
    assert.deepStrictEqual(result2.tags, ["work", "urgent"]);

    const result3 = extractTagsFromText("Buy milk, #work, #urgent");
    assert.strictEqual(result3.title, "Buy milk");
    assert.deepStrictEqual(result3.tags, ["work", "urgent"]);
  });

  it("preserves sentence punctuation when tag appears inside the title", () => {
    const result = extractTagsFromText("Review Q1, #work and send report");
    assert.strictEqual(result.title, "Review Q1, and send report");
    assert.deepStrictEqual(result.tags, ["work"]);
  });
});

describe("Reminder Creation Tool", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("creates a reminder with no priority or tags", async () => {
    const reminder = await createReminderTool({
      title: "Simple task",
    });

    assert.strictEqual(reminder.title, "Simple task");
    assert.strictEqual(reminder.priority, "");
    assert.strictEqual(reminder.notes, "");
    assert.strictEqual(createdReminders.length, 1);
    assert.strictEqual(createdReminders[0].payload.priority, undefined);
    assert.strictEqual(createdReminders[0].payload.tags, undefined);
  });

  it("creates a reminder with each supported priority", async () => {
    for (const priority of ["low", "medium", "high"] as const) {
      resetMockState();
      const reminder = await createReminderTool({
        title: `Task with ${priority} priority`,
        priority,
      });

      assert.strictEqual(reminder.priority, priority);
      assert.strictEqual(createdReminders[0].payload.priority, priority);
    }
  });

  it("creates a reminder with one tag", async () => {
    const reminder = await createReminderTool({
      title: "Work task",
      tags: "work",
    });

    assert.strictEqual(reminder.title, "Work task");
    assert.strictEqual(reminder.notes, "#work");
    assert.deepStrictEqual(createdReminders[0].payload.tags, ["work"]);
  });

  it("creates a reminder with multiple tags", async () => {
    const reminder = await createReminderTool({
      title: "Urgent project meeting",
      tags: ["work", "urgent", "#q3"],
    });

    assert.strictEqual(reminder.title, "Urgent project meeting");
    assert.strictEqual(reminder.notes, "#work #urgent #q3");
    assert.deepStrictEqual(createdReminders[0].payload.tags, ["work", "urgent", "q3"]);
  });

  it("preserves title, notes, date, recurrence, list, and location behavior", async () => {
    const reminder = await createReminderTool({
      title: "Review quarterly report",
      notes: "Check financial figures",
      dueDate: "2026-10-01",
      priority: "high",
      tags: ["finance", "urgent"],
      listId: "work-list-123",
      address: "1 Infinite Loop, Cupertino",
      proximity: "enter",
      radius: 150,
      recurrence: {
        frequency: "monthly",
        interval: 3,
        endDate: "2027-10-01",
      },
    });

    assert.strictEqual(reminder.title, "Review quarterly report");
    assert.strictEqual(reminder.notes, "Check financial figures\n\n#finance #urgent");
    assert.strictEqual(reminder.priority, "high");
    assert.strictEqual(reminder.dueDate, "2026-10-01");
    assert.strictEqual(reminder.isRecurring, true);
    assert.strictEqual(reminder.list?.id, "work-list-123");
    assert.strictEqual(reminder.location?.address, "1 Infinite Loop, Cupertino");
    assert.strictEqual(reminder.location?.proximity, "enter");
    assert.strictEqual(reminder.location?.radius, 150);
  });
});

describe("Reminder Update Tool", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("updates a reminder's priority and tags", async () => {
    const reminder = await updateReminderTool({
      reminderId: "rem-123",
      title: "Updated task title",
      notes: "Updated notes",
      priority: "medium",
      tags: ["updated", "work"],
    });

    assert.strictEqual(reminder.id, "rem-123");
    assert.strictEqual(reminder.title, "Updated task title");
    assert.strictEqual(reminder.priority, "medium");
    assert.strictEqual(reminder.notes, "Updated notes\n\n#updated #work");
    assert.strictEqual(updatedReminders.length, 1);
    assert.deepStrictEqual(updatedReminders[0].payload.tags, ["updated", "work"]);
  });

  it("preserves existing fields when updating without priority and tags", async () => {
    const reminder = await updateReminderTool({
      reminderId: "rem-456",
      isCompleted: true,
    });

    assert.strictEqual(reminder.id, "rem-456");
    assert.strictEqual(reminder.isCompleted, true);
    assert.strictEqual(updatedReminders[0].payload.priority, undefined);
    assert.strictEqual(updatedReminders[0].payload.tags, undefined);
  });
});

describe("Quick Add Natural Language Resolution with Tags", () => {
  it("resolves hashtags in quick add text as tags and leaves title clean", () => {
    const resolved = resolveQuickAddReminder(
      { title: "Buy groceries #errands #shopping" },
      "Buy groceries #errands #shopping",
      [{ id: "list-1", title: "Personal" }],
    );

    assert.strictEqual(resolved.title, "Buy groceries");
    assert.deepStrictEqual(resolved.tags, ["errands", "shopping"]);
  });

  it("preserves list hashtags and at-mentions while extracting non-list hashtags as tags", () => {
    const resolvedHash = resolveQuickAddReminder(
      { title: "Finish presentation #Work #urgent" },
      "Finish presentation #Work #urgent",
      [{ id: "work-id", title: "Work" }],
    );

    assert.strictEqual(resolvedHash.title, "Finish presentation");
    assert.strictEqual(resolvedHash.listId, "work-id");
    assert.deepStrictEqual(resolvedHash.tags, ["urgent"]);

    const resolvedAt = resolveQuickAddReminder(
      { title: "Finish presentation @Work #urgent" },
      "Finish presentation @Work #urgent",
      [{ id: "work-id", title: "Work" }],
    );

    assert.strictEqual(resolvedAt.title, "Finish presentation");
    assert.strictEqual(resolvedAt.listId, "work-id");
    assert.deepStrictEqual(resolvedAt.tags, ["urgent"]);
  });

  it("correctly matches punctuated, unicode, and emoji list names with # and @", () => {
    const lists = [
      { id: "punct-id", title: "Work!" },
      { id: "unicode-id", title: "Café" },
      { id: "emoji-id", title: "⭐" },
    ];

    const res1 = resolveQuickAddReminder({ title: "Send email #Work!" }, "Send email #Work!", lists);
    assert.strictEqual(res1.title, "Send email");
    assert.strictEqual(res1.listId, "punct-id");

    const res2 = resolveQuickAddReminder({ title: "Order beans @Café" }, "Order beans @Café", lists);
    assert.strictEqual(res2.title, "Order beans");
    assert.strictEqual(res2.listId, "unicode-id");

    const res3 = resolveQuickAddReminder({ title: "Important task #⭐ #urgent" }, "Important task #⭐ #urgent", lists);
    assert.strictEqual(res3.title, "Important task");
    assert.strictEqual(res3.listId, "emoji-id");
    assert.deepStrictEqual(res3.tags, ["urgent"]);
  });

  it("correctly matches list names followed by punctuation separators", () => {
    const lists = [{ id: "work-id", title: "Work" }];

    const res1 = resolveQuickAddReminder({ title: "Buy milk #Work," }, "Buy milk #Work,", lists);
    assert.strictEqual(res1.title, "Buy milk");
    assert.strictEqual(res1.listId, "work-id");

    const res2 = resolveQuickAddReminder(
      { title: "Buy milk #Work, and bread" },
      "Buy milk #Work, and bread",
      lists,
    );
    assert.strictEqual(res2.title, "Buy milk, and bread");
    assert.strictEqual(res2.listId, "work-id");

    const res3 = resolveQuickAddReminder(
      { title: "Review document @Work. Please finish soon" },
      "Review document @Work. Please finish soon",
      lists,
    );
    assert.strictEqual(res3.title, "Review document. Please finish soon");
    assert.strictEqual(res3.listId, "work-id");
  });

  it("extracts natural-language due dates and tags when AI omits due date", () => {
    const fakeNow = new Date("2026-09-22T10:00:00.000Z");
    const resolved = resolveQuickAddReminder(
      { title: "Call mom tomorrow at 9 #family" },
      "Call mom tomorrow at 9 #family",
      [{ id: "list-1", title: "Personal" }],
      fakeNow,
    );

    assert.strictEqual(resolved.title, "Call mom");
    assert.ok(resolved.dueDate && resolved.dueDate.startsWith("2026-09-23"));
    assert.deepStrictEqual(resolved.tags, ["family"]);
  });

  it("coerces empty string listId and other optional fields to undefined", () => {
    const resolved = resolveQuickAddReminder(
      {
        title: "Just a plain reminder",
        listId: "",
        dueDate: "",
        notes: "",
        priority: "",
        address: "",
        proximity: "",
      },
      "Just a plain reminder",
      [{ id: "list-1", title: "Personal" }],
    );

    assert.strictEqual(resolved.title, "Just a plain reminder");
    assert.strictEqual(resolved.listId, undefined);
    assert.strictEqual(resolved.dueDate, undefined);
    assert.strictEqual(resolved.notes, undefined);
    assert.strictEqual(resolved.priority, undefined);
    assert.strictEqual(resolved.address, undefined);
    assert.strictEqual(resolved.proximity, undefined);
  });

  it("applies defaultListName when no list is specified in text or AI", () => {
    const resolved = resolveQuickAddReminder(
      { title: "Buy eggs" },
      "Buy eggs",
      [
        { id: "list-1", title: "Personal" },
        { id: "list-2", title: "Inbox" },
      ],
      new Date(),
      "Inbox",
    );

    assert.strictEqual(resolved.title, "Buy eggs");
    assert.strictEqual(resolved.listId, "list-2");
  });

  it("matches defaultListName case-insensitively with trimming", () => {
    const resolved = resolveQuickAddReminder(
      { title: "Buy eggs" },
      "Buy eggs",
      [
        { id: "list-1", title: "Personal" },
        { id: "list-2", title: "Work Projects" },
      ],
      new Date(),
      "  work projects  ",
    );

    assert.strictEqual(resolved.title, "Buy eggs");
    assert.strictEqual(resolved.listId, "list-2");
  });

  it("prefers explicitly mentioned list over defaultListName", () => {
    const resolved = resolveQuickAddReminder(
      { title: "Buy milk @Personal" },
      "Buy milk @Personal",
      [
        { id: "list-1", title: "Personal" },
        { id: "list-2", title: "Inbox" },
      ],
      new Date(),
      "Inbox",
    );

    assert.strictEqual(resolved.title, "Buy milk");
    assert.strictEqual(resolved.listId, "list-1");
  });

  it("falls back to undefined if defaultListName does not match any list", () => {
    const resolved = resolveQuickAddReminder(
      { title: "Buy eggs" },
      "Buy eggs",
      [{ id: "list-1", title: "Personal" }],
      new Date(),
      "NonExistentList",
    );

    assert.strictEqual(resolved.title, "Buy eggs");
    assert.strictEqual(resolved.listId, undefined);
  });

  it("validates recurrence with weekdays and weekends frequencies", () => {
    const aiWeekday = JSON.stringify({
      title: "Daily standup",
      dueDate: "2026-09-24",
      recurrence: { frequency: "weekdays", interval: 1 },
    });
    const parsedWeekday = parseAIResponse(aiWeekday);
    assert.deepStrictEqual(parsedWeekday.recurrence, { frequency: "weekdays", interval: 1 });

    const aiWeekend = JSON.stringify({
      title: "Weekly chores",
      dueDate: "2026-09-26",
      recurrence: { frequency: "weekends", interval: 1 },
    });
    const parsedWeekend = parseAIResponse(aiWeekend);
    assert.deepStrictEqual(parsedWeekend.recurrence, { frequency: "weekends", interval: 1 });
  });

  it("clears invalid recurrence frequency in parseAIResponse", () => {
    const aiInvalid = JSON.stringify({
      title: "Task",
      dueDate: "2026-09-24",
      recurrence: { frequency: "invalid_freq", interval: 1 },
    });
    const parsed = parseAIResponse(aiInvalid);
    assert.strictEqual(parsed.recurrence, undefined);
  });
});

describe("Reminder List Item Tag Display", () => {
  it("extracts tags for accessories while keeping notes intact", () => {
    const rawNotes = "Meeting preparation\n\n#work #urgent";
    const { tags } = extractTagsFromNotes(rawNotes);

    assert.deepStrictEqual(tags, ["work", "urgent"]);

    const accessoryText = tags.map((t) => `#${t}`).join(" ");
    const accessoryTooltip = `Tags: ${tags.map((t) => `#${t}`).join(", ")}`;

    assert.strictEqual(accessoryText, "#work #urgent");
    assert.strictEqual(accessoryTooltip, "Tags: #work, #urgent");
  });

  it("builds keywords containing both hashed and unhashed tags plus full note tokens", () => {
    const reminder = {
      title: "Review PR",
      notes: "Important items\n\n#engineering #v2",
    };

    const keywords = [reminder.title];
    const { tags } = extractTagsFromNotes(reminder.notes);

    if (tags.length > 0) {
      keywords.push(...tags.map((t) => `#${t}`), ...tags);
    }
    if (reminder.notes) {
      keywords.push(...reminder.notes.split(" "));
    }

    assert.deepStrictEqual(keywords, [
      "Review PR",
      "#engineering",
      "#v2",
      "engineering",
      "v2",
      "Important",
      "items\n\n#engineering",
      "#v2",
    ]);
  });
});


