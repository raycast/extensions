import assert from "node:assert/strict";
import test from "node:test";
import {
  autoCareIsOn,
  autoCareSupported,
  chooserNotes,
  chooserOptions,
  clockText,
  diskRequest,
  diskRows,
  folderMode,
  folderRequest,
  folderText,
  folderTimes,
  launchSelection,
  memoryRequest,
  memoryText,
  parseListedTypes,
  scopeText,
  typesNames,
  yoursConsequence,
  yoursScope,
} from "../src/mint-care.ts";
import type { AutoCareJSON } from "../src/mint-model.ts";

/** autocare.list's shape as Mint 1.1.2 answered it on 2026-10-31, paths and ids replaced. */
const care: AutoCareJSON = {
  automationAllowed: true,
  memory: { available: true, enabled: true, threshold: 93 },
  folders: [
    { path: "/Users/x/Desktop", enabled: true, organizeOnArrival: false },
    { path: "/Users/x/Downloads", enabled: true, organizeOnArrival: false },
  ],
  tasks: [
    { taskType: "organize", enabled: true, scheduleFrequency: "manual", folderPaths: [] },
    {
      taskType: "organize",
      enabled: true,
      scheduleFrequency: "daily",
      scheduleTimeMinutes: 540,
      folderPaths: ["/Users/x/Desktop"],
    },
    {
      taskType: "organize",
      enabled: false,
      scheduleFrequency: "daily",
      scheduleTimeMinutes: 600,
      folderPaths: ["/Users/x/Downloads"],
    },
    {
      taskType: "cleanup",
      diskCareBucket: "optimizable",
      diskCareScope: { chips: ["*"], minimumAgeDays: 0 },
      enabled: true,
      scheduleFrequency: "hourly",
      scheduleTimeMinutes: 420,
    },
    {
      taskType: "cleanup",
      diskCareBucket: "clutter",
      diskCareScope: { chips: ["clutter:trash"], minimumAgeDays: 30 },
      enabled: true,
      scheduleFrequency: "hourly",
      scheduleTimeMinutes: 420,
    },
    {
      taskType: "cleanup",
      diskCareBucket: "rebuildable",
      diskCareScope: { chips: ["*"], minimumAgeDays: 7 },
      enabled: true,
      scheduleFrequency: "hourly",
      scheduleTimeMinutes: 420,
    },
  ] as AutoCareJSON["tasks"],
};

const off = (bucket: string) => ({
  ...care,
  tasks: care.tasks!.map((task) => (task.diskCareBucket === bucket ? { ...task, enabled: false } : task)),
});

test("each disk row reads as the clock's popover: the bucket, then what its plan takes", () => {
  assert.deepEqual(
    diskRows(care).map((row) => [row.title, row.on, row.detail]),
    [
      ["Optimizable", true, "All types"],
      ["Safe to clean", true, "All types · 7+ days"],
      ["Yours", true, "Trash · 30+ days"],
    ],
  );
  assert.equal(autoCareIsOn(care), true);
  assert.equal(autoCareIsOn({ ...care, tasks: [] }), false);
});

test("an off bucket keeps its rule; Yours with no rule asks for its types", () => {
  const rows = diskRows(off("clutter"));
  assert.equal(rows[2].on, false);
  assert.equal(rows[2].detail, undefined, "a saved rule is turned on again as it was");
  assert.deepEqual(rows[2].savedScope, { chips: ["clutter:trash"], minimumAgeDays: 30 });
  const fresh = diskRows({ ...care, tasks: [] });
  assert.equal(fresh[2].detail, "Choose what it may take");
  assert.equal(fresh[0].detail, undefined);
});

test("a plan is on only as DiskAutoCare.isScheduled says: enabled, a time, a valid scope", () => {
  const plan = (extra: Record<string, unknown>) => ({
    tasks: [
      {
        taskType: "cleanup",
        diskCareBucket: "rebuildable",
        enabled: true,
        scheduleFrequency: "hourly",
        scheduleTimeMinutes: 420,
        ...extra,
      },
    ],
  });
  assert.equal(diskRows(plan({}) as AutoCareJSON)[1].on, true, "Safe to clean needs no scope");
  assert.equal(diskRows(plan({ scheduleTimeMinutes: undefined }) as AutoCareJSON)[1].on, false);
  assert.equal(diskRows(plan({ scheduleFrequency: "manual" }) as AutoCareJSON)[1].on, false);
  assert.equal(diskRows(plan({ diskCareScope: { chips: [], minimumAgeDays: 0 } }) as AutoCareJSON)[1].on, false);
  const leftovers = plan({ diskCareBucket: "leftovers" }) as AutoCareJSON;
  assert.equal(diskRows(leftovers)[1].on, true, "a retired bucket name means its tier");
  const yoursNoScope = plan({ diskCareBucket: "clutter" }) as AutoCareJSON;
  assert.equal(diskRows(yoursNoScope)[2].on, false, "Yours never runs without its types");
});

test("types are named as typesNames names them: three or fewer by name, else a count", () => {
  assert.equal(typesNames(undefined), "All types");
  assert.equal(typesNames({ chips: ["clutter:restorePoints", "clutter:captures"], minimumAgeDays: 0 }), "Captures, Time Machine");
  assert.equal(typesNames({ chips: ["clutter:trash", "clutter:mystery"], minimumAgeDays: 0 }), "2 types");
  assert.equal(
    typesNames({ chips: ["clutter:trash", "clutter:desktop", "clutter:apps", "clutter:music"], minimumAgeDays: 0 }),
    "4 types",
  );
  assert.equal(typesNames({ chips: ["kind:caches"], minimumAgeDays: 0 }), "Caches");
  assert.equal(scopeText({ chips: ["clutter:captures"], minimumAgeDays: 0 }), "Captures");
});

test("turning a bucket off sends only the bucket, off, at its own time", () => {
  const [optimizable] = diskRows(care);
  assert.deepEqual(diskRequest(optimizable, false), {
    action: "autocare.disk",
    bucket: "optimizable",
    enabled: false,
    timeMinutes: 420,
    confirmed: true,
  });
});

test("turning a bucket on reuses its saved rule, else every type at the drawer's default age", () => {
  const saved = diskRows(off("rebuildable"))[1];
  assert.deepEqual(diskRequest(saved, true), {
    action: "autocare.disk",
    bucket: "rebuildable",
    enabled: true,
    timeMinutes: 420,
    confirmed: true,
  });
  const fresh = diskRows({ tasks: [] })[1];
  assert.deepEqual(diskRequest(fresh, true).diskCareScope, { chips: ["*"], minimumAgeDays: 0 });
  assert.equal(diskRequest(fresh, true).timeMinutes, 420, "DiskAutoCare's 7:00 default");
  assert.throws(() => diskRequest(diskRows({ tasks: [] })[2], true), /Choose what Auto Care may take/);
  const chosen = { chips: ["clutter:captures"], minimumAgeDays: 30 };
  assert.deepEqual(diskRequest(diskRows({ tasks: [] })[2], true, chosen).diskCareScope, chosen);
});

test("Yours' types: All types stands alone, conversations are never chosen, the age is clamped", () => {
  assert.deepEqual(yoursScope(["*", "clutter:trash"], 30), { chips: ["*"], minimumAgeDays: 30 });
  assert.deepEqual(yoursScope(["clutter:codexConversations", "clutter:captures"], 9000), {
    chips: ["clutter:captures"],
    minimumAgeDays: 3650,
  });
  assert.equal(yoursScope(["clutter:conversations"], 30), undefined);
  assert.equal(yoursScope([], 30), undefined);
});

test("the chooser lists what the drawer last listed, then a saved type that is not there now", () => {
  const listed = parseListedTypes(`{
    clutter =     (
        "clutter:codexConversations",
        "clutter:trash",
        "clutter:captures"
    );
    rebuildable =     (
        "kind:caches"
    );
}`);
  assert.deepEqual(listed, ["clutter:codexConversations", "clutter:trash", "clutter:captures"]);
  const options = chooserOptions(listed, ["clutter:desktop", "*"]);
  assert.deepEqual(
    options.map((option) => [option.title, option.listed, option.choosable]),
    [
      ["Codex", true, false],
      ["Trash", true, true],
      ["Captures", true, true],
      ["Desktop", false, true],
    ],
  );
  const none = chooserOptions(undefined, []);
  assert.equal(none.length, 15, "every Yours type but the conversations");
  assert.ok(none.every((option) => option.choosable && option.listed));
  assert.equal(parseListedTypes(undefined), undefined);
  assert.equal(parseListedTypes("{ rebuildable = ( \"kind:caches\" ); }"), undefined);
});

test("the question before Yours says where its files go, with the chooser's notes", () => {
  assert.deepEqual(chooserNotes(["clutter:workspaces", "clutter:trash"]), [
    "Folders with uncommitted changes, or commits only they hold, are always skipped.",
    "Removed permanently.",
  ]);
  assert.equal(yoursConsequence({ chips: ["clutter:captures"], minimumAgeDays: 30 }), "Files go to the Trash.");
  assert.equal(yoursConsequence({ chips: ["clutter:trash"], minimumAgeDays: 30 }), "Trash: removed permanently.");
  assert.equal(
    yoursConsequence({ chips: ["*"], minimumAgeDays: 30 }),
    "Files go to the Trash; Trash, Time Machine: removed permanently. Folders with uncommitted changes, or commits only they hold, are always skipped.",
  );
});

test("memory reads as the Memory page and sends both halves, the other kept", () => {
  assert.equal(memoryText(care), "Starts at 93%");
  assert.equal(memoryText({ ...care, memory: { available: true, enabled: false, threshold: 93 } }), "Off");
  assert.equal(memoryText({ ...care, automationAllowed: false }), "Locked");
  assert.equal(memoryText(undefined), "…");
  assert.deepEqual(memoryRequest(care, { enabled: false }), {
    action: "autocare.memory",
    enabled: false,
    threshold: 93,
    confirmed: true,
  });
  assert.deepEqual(memoryRequest(care, { threshold: 92 }), {
    action: "autocare.memory",
    enabled: true,
    threshold: 92,
    confirmed: true,
  });
  assert.throws(() => memoryRequest(care, { threshold: 49 }), /50% through 99%/);
  assert.throws(() => memoryRequest(care, { threshold: 100 }), /50% through 99%/);
});

test("a folder reads as the Files page: Daily at its time, As files arrive, or Off", () => {
  assert.equal(folderText("/Users/x/Desktop", care), "Daily at 9:00 AM");
  assert.equal(folderText("/Users/x/Desktop/", care), "Daily at 9:00 AM", "a trailing slash is the same folder");
  assert.equal(folderText("/Users/x/Downloads", care), "Off");
  assert.deepEqual(folderMode("/Users/x/Downloads", care), { mode: "manual", timeMinutes: 600 }, "its last time kept");
  const arriving = { ...care, folders: [{ path: "/Users/x/Desktop", organizeOnArrival: true }] };
  assert.equal(folderText("/Users/x/Desktop", arriving), "As files arrive", "arrival wins over a daily plan");
  assert.deepEqual(folderMode("/Users/x/Inbox", care), { mode: "manual", timeMinutes: 540 });
  assert.equal(folderText("/Users/x/Desktop", { ...care, automationAllowed: false }), "Locked");
});

test("a folder's request carries its path, mode and minute of the day", () => {
  assert.deepEqual(folderRequest("/Users/x/Desktop", "daily", 1290), {
    action: "autocare.folder",
    path: "/Users/x/Desktop",
    mode: "daily",
    timeMinutes: 1290,
    confirmed: true,
  });
  assert.equal(folderRequest("/Users/x/Desktop", "manual", 540).mode, "manual");
  assert.throws(() => folderRequest("/Users/x/Desktop", "daily", 1440));
  assert.equal(clockText(0), "12:00 AM");
  assert.equal(clockText(1290), "9:30 PM");
  assert.deepEqual(folderTimes(1290).slice(21, 24), [1260, 1290, 1320], "the folder's own time sits between the hours");
  assert.equal(folderTimes(540).length, 24);
});

test("Auto Care needs Mint 1.1.2; an older or unnamed Mint gets the update page", () => {
  assert.equal(autoCareSupported("1.1.2"), true);
  assert.equal(autoCareSupported("1.2.0"), true);
  assert.equal(autoCareSupported("1.1.1"), false);
  assert.equal(autoCareSupported("1.0.99"), false);
  assert.equal(autoCareSupported(undefined), false);
});

test("another command opens Auto Care on its own row", () => {
  assert.equal(launchSelection({ section: "disk", bucket: "rebuildable" }), "disk:rebuildable");
  assert.equal(launchSelection({ section: "disk" }), "disk:optimizable");
  assert.equal(launchSelection({ section: "memory" }), "memory");
  assert.equal(launchSelection({ section: "folders", folder: "/Users/x/Desktop" }), "folder:/Users/x/Desktop");
  assert.equal(launchSelection(undefined), undefined);
});
