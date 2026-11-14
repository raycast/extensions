import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CUSTOM_RULE_ICON,
  NATIVE_APPROVAL_CAPABILITY,
  allowanceLine,
  conversationReceipt,
  customRule,
  handlingRows,
  hasCapability,
  historyRows,
  notApprovedText,
  pictureRemovalReceipt,
  pictureRows,
  picturesChanged,
  ruleRows,
  ruleSummary,
  trashReceipt,
  trashRows,
} from "../src/mint-parity.ts";

const draft = { name: "Old installers", extensions: ".dmg, PKG zip", nameKeyword: "", olderThanDays: "30", minSizeMB: "", action: "trash" as const };

test("the commands Mint confirms need Mint's own window, never the extension's flag", () => {
  assert.equal(hasCapability({ capabilities: ["surface.v1", NATIVE_APPROVAL_CAPABILITY] }, NATIVE_APPROVAL_CAPABILITY), true);
  // 1.1.3 and an early 1.2 build: native approval for MCP only.
  assert.equal(hasCapability({ capabilities: ["surface.v1", "mcp.native-approval.v1"] }, NATIVE_APPROVAL_CAPABILITY), false);
  assert.equal(hasCapability(undefined, NATIVE_APPROVAL_CAPABILITY), false);
});

test("a request Mint's window did not approve says nothing changed", () => {
  assert.equal(notApprovedText({ removedCount: 2 } as never), undefined);
  assert.equal(notApprovedText({ cancelled: true, started: false, approval: "cancelled" }), "Not confirmed in Mint. Nothing changed.");
  assert.equal(notApprovedText({ cancelled: true, started: false, approval: "declined" }), "Not confirmed in Mint. Nothing changed.");
  assert.equal(notApprovedText({ cancelled: true, started: false, approval: "expired" }), "The confirmation in Mint expired. Nothing changed.");
  assert.equal(notApprovedText({ cancelled: true, started: false, notice: "Mint's words" }), "Mint's words");
  // Cancelled while running is a receipt, not a refusal.
  assert.equal(notApprovedText({ cancelled: true, started: true }), undefined);
});

test("the Trash lists largest first and says what a removal kept", () => {
  const rows = trashRows({
    sessionID: "s",
    complete: true,
    items: [
      { id: "a", path: "/a", name: "a", bytes: 10, isDirectory: false, inICloud: false, needsAdministrator: false },
      { id: "b", path: "/b", name: "b", bytes: 30, isDirectory: true, inICloud: true, needsAdministrator: false },
    ],
  });
  assert.deepEqual(rows.map((row) => row.id), ["b", "a"]);
  assert.equal(trashReceipt({ removedCount: 2, physicallyReclaimedBytes: 2_000_000 }), "2 items deleted · 2 MB freed");
  assert.equal(
    trashReceipt({ removedCount: 1, failedCount: 1, physicallyReclaimedBytes: 0, failures: [{ name: "x", reason: "in use" }] }),
    "1 item deleted · 0 B freed · 1 kept: in use",
  );
});

test("a conversation run says what changed in the verb's words", () => {
  assert.equal(conversationReceipt("agents.delete", { deletedCount: 3, physicallyReclaimedBytes: 5_000_000 }), "3 files deleted · 5 MB freed");
  assert.equal(
    conversationReceipt("agents.remove-media", { changedCount: 1, physicallyReclaimedBytes: 1_000, failures: ["x"] }),
    "Pictures removed from 1 file · 1 KB freed · 1 left as they were",
  );
  assert.equal(conversationReceipt("agents.optimize", { changedCount: 2, physicallyReclaimedBytes: 0 }), "2 files optimized · 0 B back");
});

test("kept pictures go last, the rest by what removing them saves", () => {
  const rows = pictureRows({
    sessionID: "p",
    source: "conversations",
    items: [
      { id: "k", copies: 1, estimatedSavingBytes: 900, mime: "image/png", files: [], kept: true },
      { id: "s", copies: 1, estimatedSavingBytes: 10, mime: "image/png", files: [], kept: false },
      { id: "l", copies: 2, estimatedSavingBytes: 500, mime: "image/png", files: [], kept: false },
    ],
  });
  assert.deepEqual(rows.map((row) => row.id), ["l", "s", "k"]);
});

// Greptile on raycast/extensions#33320: 101 chosen, 100 sent, and the toast
// said 101. A receipt counts what Mint's fresh review shows changed.
test("a picture receipt counts only what Mint changed", () => {
  const review = (items: Array<{ id: string; kept: boolean }>) => ({
    sessionID: "next",
    source: "conversations" as const,
    items: items.map((item) => ({ ...item, copies: 1, estimatedSavingBytes: 1, mime: "image/png", files: ["/c.jsonl"] })),
  });
  // "b" is still in a conversation Mint could not change.
  const removed = { physicallyReclaimedBytes: 3_000_000, review: review([{ id: "b", kept: false }, { id: "z", kept: true }]) };
  assert.equal(picturesChanged(["a", "b", "c"], removed), 2);
  assert.equal(pictureRemovalReceipt(["a", "b", "c"], removed), "2 pictures removed · 3 MB freed · 1 left as they were");
  assert.equal(pictureRemovalReceipt(["a"], { savedBytes: 0, review: review([]) }), "1 picture removed · 0 B freed");
  // Mint did not remove them: its own reason follows, a sentence or a `{ reason }` row.
  const refused = { failures: ["Your free cleanup is used up."], review: review([{ id: "a", kept: false }, { id: "b", kept: false }]) };
  assert.equal(pictureRemovalReceipt(["a", "b"], refused), "0 pictures removed · 0 B freed · 2 left as they were: Your free cleanup is used up.");
  assert.equal(pictureRemovalReceipt(["a", "b"], { ...refused, failures: [{ path: "/c.jsonl", reason: "File changed." }] }), "0 pictures removed · 0 B freed · 2 left as they were: File changed.");
  assert.equal(pictureRemovalReceipt(["a", "b", "c"], { ...removed, failures: ["Not used: all but one went."] }), "2 pictures removed · 3 MB freed · 1 left as they were: Not used: all but one went.");
  // No fresh review (Mint could not read it again): Mint's own count of conversations changed.
  assert.equal(picturesChanged(["a"], { changedCount: 2 }), undefined);
  assert.equal(pictureRemovalReceipt(["a"], { changedCount: 2, savedBytes: 5_000 }), "Pictures removed from 2 conversations · 5 KB freed");
  // Keep: only the pictures that now carry the choice.
  const kept = { review: review([{ id: "a", kept: true }, { id: "b", kept: false }]) };
  assert.equal(picturesChanged(["a", "b"], kept, true), 1);
  assert.equal(picturesChanged(["a", "b"], kept, false), 1);
});

test("history merges the four logs newest first", () => {
  const rows = historyRows({
    disk: [
      { date: "2026-11-01T10:00:00Z", freedBytes: 2_000_000_000, itemCount: 4, movedToTrash: true, autoCareBucket: null },
      { date: "2026-11-03T10:00:00Z", freedBytes: 1_000_000, itemCount: 1, lossless: true, autoCareBucket: "optimizable" },
    ],
    memory: [{ date: "2026-11-02T10:00:00Z", freedBytes: 500_000_000, quitCount: 2, quitNames: ["Slack", "Zoom"], wasAutomatic: false }],
    organize: [{ date: "2026-11-04T10:00:00Z", filesMoved: 12, folderCount: 1 }],
    uninstall: [{ date: "2026-10-30T10:00:00Z", appName: "Foo", freedBytes: 80_000_000, appCount: 1 }],
  });
  assert.deepEqual(rows.map((row) => row.kind), ["organize", "disk", "memory", "disk", "uninstall"]);
  assert.equal(rows[1].title, "1 MB optimized, nothing deleted");
  assert.equal(rows[1].automatic, true);
  assert.equal(rows[2].detail, "Slack, Zoom");
  assert.equal(rows[3].title, "2 GB moved to the Trash");
  assert.equal(historyRows(undefined).length, 0);
});

test("Protect comes before Needs Review", () => {
  const rows = handlingRows({
    permissions: [
      { id: "1", path: "/b", level: "needs_review", source: "user" },
      { id: "2", path: "/z", level: "protect", source: "user" },
      { id: "3", path: "/a", level: "protect", source: "user" },
    ],
  });
  assert.deepEqual(rows.map((row) => row.path), ["/a", "/z", "/b"]);
});

test("a rule from the form is a custom rule Mint can check", () => {
  const made = customRule(draft, "custom-1");
  assert.deepEqual(made.rule, {
    id: "custom-1",
    name: "Old installers",
    icon: CUSTOM_RULE_ICON,
    enabled: true,
    builtin: false,
    filter: { extensions: ["dmg", "pkg", "zip"], olderThanDays: 30 },
    preferredAction: "trash",
  });
  assert.equal(customRule({ ...draft, name: " " }, "x").problem, "Give the rule a name.");
  assert.equal(customRule({ ...draft, olderThanDays: "1.5" }, "x").problem, "Older than takes whole days, 1 to 3650.");
  assert.equal(
    customRule({ ...draft, extensions: "", olderThanDays: "" }, "x").problem,
    "Choose at least one thing the rule matches.",
  );
  assert.equal(ruleSummary(made.rule!.filter), ".dmg .pkg .zip · older than 30 days");
  assert.equal(ruleSummary({}), "Every file");
});

test("an edit keeps what the form does not show", () => {
  const listed = {
    id: "deepclean-com.example.app",
    name: "Example Remnants",
    icon: "trash.slash",
    accentColor: "red",
    group: "deep-clean",
    subtitle: "com.example.app",
    enabled: false,
    builtin: false,
    filter: { nameKeyword: "com.example.app", nameMatchMode: "contains", namePrefix: "Example", timestampMode: "lastOpened" },
    preferredAction: "trash" as const,
  };
  const edited = customRule({ ...draft, extensions: "", olderThanDays: "", nameKeyword: "com.example" }, listed.id, listed).rule!;
  assert.equal(edited.icon, "trash.slash");
  assert.equal(edited.accentColor, "red");
  assert.equal(edited.group, "deep-clean");
  assert.equal(edited.subtitle, "com.example.app");
  assert.deepEqual(edited.filter, { nameKeyword: "com.example", nameMatchMode: "contains", namePrefix: "Example", timestampMode: "lastOpened" });
  // Emptying the form's fields leaves a rule that still matches by what it kept.
  const prefixOnly = customRule({ ...draft, extensions: "", olderThanDays: "" }, listed.id, listed);
  assert.equal(prefixOnly.problem, undefined);
  assert.equal(prefixOnly.rule!.filter.nameKeyword, undefined);
  assert.equal(prefixOnly.rule!.filter.namePrefix, "Example");
  // A field emptied in the form leaves the rule.
  const shorter = customRule({ ...draft, olderThanDays: "" }, "custom-1", customRule(draft, "custom-1").rule as never).rule!;
  assert.equal(shorter.filter.olderThanDays, undefined);
});

test("built-in rules list before the person's own", () => {
  const rows = ruleRows({
    rules: [
      { id: "c", name: "Mine", enabled: true, builtin: false, filter: {}, preferredAction: "trash" },
      { id: "b", name: "Zed", enabled: true, builtin: true, filter: {}, preferredAction: "review" },
      { id: "a", name: "Alpha", enabled: false, builtin: true, filter: {}, preferredAction: "trash" },
    ],
  });
  assert.deepEqual(rows.map((row) => row.id), ["a", "b", "c"]);
});

test("the allowance line shows only on a plan with a limit", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  assert.equal(allowanceLine({ remainingCleanupBytes: null }, now), undefined);
  assert.equal(
    allowanceLine({ remainingCleanupBytes: 400_000_000, cleanupAllowanceResetsAt: "2026-11-09T08:00:00Z" }, now),
    "400 MB free to clean or organize this week · back in 4 days",
  );
  assert.equal(allowanceLine({ remainingCleanupBytes: 0 }, now), "0 B free to clean or organize this week");
});

test("package.json lists every new command the names in row 15's record expect", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { commands: Array<{ name: string }> };
  const names = manifest.commands.map((command) => command.name);
  for (const name of ["mint-trash", "mint-conversations", "mint-history", "mint-handling", "mint-rules"]) {
    assert.ok(names.includes(name), name);
  }
});
