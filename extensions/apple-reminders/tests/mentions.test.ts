import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_MENTIONS,
  MAX_RESOURCE_REMINDERS,
  hexListColor,
  listIconSvg,
  parseListMentionUri,
  toListMentionUri,
  toListMentions,
  toListResource,
  type MentionList,
} from "../src/helpers/mentions";

function list(title: string, overrides: Partial<MentionList> = {}): MentionList {
  return { id: title.toLowerCase(), title, color: "#FF9500", isDefault: false, account: "iCloud", ...overrides };
}

const icon = (item: MentionList) => `icon:${item.id}`;

describe("List mention URIs", () => {
  it("round-trips list IDs, including characters that need escaping", () => {
    for (const id of ["A1B2C3D4-0000-4000-8000-000000000000", "list/with spaces?&#"]) {
      assert.equal(parseListMentionUri(toListMentionUri(id)), id);
    }
  });

  it("rejects URIs from other schemes, empty IDs, and malformed escapes", () => {
    for (const uri of ["notion://pages/abc", "apple-reminders://lists/", "apple-reminders://lists/%E0%A4%A"]) {
      assert.throws(() => parseListMentionUri(uri), /Invalid Apple Reminders list URI/);
    }
  });
});

describe("List mention search", () => {
  const lists = [
    list("Work"),
    list("Groceries"),
    list("Reminders", { isDefault: true }),
    list("Home Projects"),
    list("Café"),
  ];

  it("lists the default list first, then every list by name, when the query is empty", () => {
    assert.deepEqual(
      toListMentions(lists, "  ", icon).map((mention) => mention.title),
      ["Reminders", "Café", "Groceries", "Home Projects", "Work"],
    );
  });

  it("matches every typed word case- and accent-insensitively, with names starting with the query first", () => {
    assert.deepEqual(
      toListMentions([...lists, list("My Groceries")], "GRO", icon).map((mention) => mention.title),
      ["Groceries", "My Groceries"],
    );
    assert.deepEqual(
      toListMentions(lists, "proj home", icon).map((mention) => mention.title),
      ["Home Projects"],
    );
    assert.deepEqual(
      toListMentions(lists, "cafe", icon).map((mention) => mention.title),
      ["Café"],
    );
  });

  it("builds each row from the list's URI and icon, without a description for a single account", () => {
    assert.deepEqual(toListMentions([list("Work", { id: "work-id" })], "", icon), [
      { title: "Work", uri: "apple-reminders://lists/work-id", icon: "icon:work-id" },
    ]);
  });

  it("names the account when lists come from more than one", () => {
    const mentions = toListMentions(
      [list("Work", { id: "a" }), list("Work", { id: "b", account: "Exchange" })],
      "work",
      icon,
    );
    assert.deepEqual(
      mentions.map((mention) => mention.description),
      ["Exchange", "iCloud"],
    );
  });

  it(`returns at most ${MAX_MENTIONS} lists`, () => {
    const many = Array.from({ length: MAX_MENTIONS + 10 }, (_, index) => list(`List ${index}`));
    assert.equal(toListMentions(many, "", icon).length, MAX_MENTIONS);
  });
});

describe("List mention icons", () => {
  it("accepts only #rrggbb colors", () => {
    assert.equal(hexListColor("#FF9500"), "#ff9500");
    assert.equal(hexListColor("orange"), undefined);
    assert.equal(hexListColor(""), undefined);
  });

  it("draws the list icon in the list's color", () => {
    assert.match(listIconSvg("#ff9500"), /<circle cx="32" cy="32" r="30" fill="#ff9500"\/>/);
  });
});

describe("List mention resource", () => {
  const reminder = (id: string, overrides = {}) => ({
    id,
    title: `Reminder ${id}`,
    openUrl: `x-apple-reminderkit://REMCDReminder/${id}`,
    notes: "",
    dueDate: null,
    priority: "",
    isRecurring: false,
    recurrenceRule: "",
    attachedUrls: [],
    ...overrides,
  });

  it("includes the list ID and only the fields each reminder sets", () => {
    const resource = toListResource(list("Groceries", { id: "groceries-id", isDefault: true }), [
      reminder("milk", {
        notes: " Oat milk ",
        dueDate: "2026-11-18",
        priority: "high",
        isRecurring: true,
        recurrenceRule: "Repeats Every Week",
      }),
      reminder("bread"),
    ]);
    assert.equal(resource.mimeType, "application/json");
    assert.deepEqual(JSON.parse(resource.text), {
      id: "groceries-id",
      title: "Groceries",
      account: "iCloud",
      isDefault: true,
      incompleteReminders: [
        {
          id: "milk",
          title: "Reminder milk",
          openUrl: "x-apple-reminderkit://REMCDReminder/milk",
          notes: "Oat milk",
          dueDate: "2026-11-18",
          priority: "high",
          recurrence: "Repeats Every Week",
        },
        { id: "bread", title: "Reminder bread", openUrl: "x-apple-reminderkit://REMCDReminder/bread" },
      ],
    });
  });

  it(`keeps the first ${MAX_RESOURCE_REMINDERS} reminders and says how to find the rest`, () => {
    const reminders = Array.from({ length: MAX_RESOURCE_REMINDERS + 1 }, (_, index) => reminder(String(index)));
    const data = JSON.parse(toListResource(list("Work"), reminders).text);
    assert.equal(data.incompleteReminders.length, MAX_RESOURCE_REMINDERS);
    assert.match(data.note, /get-reminders/);
  });

  it("says the list is incomplete when the query hit its own limit", () => {
    const data = JSON.parse(toListResource(list("Work"), [reminder("a")], true).text);
    assert.equal(data.incompleteReminders.length, 1);
    assert.match(data.note, /Only the first 1 incomplete reminders/);
  });
});
