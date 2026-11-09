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
  pictureRows,
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

test("the capability the extension asks for is the one mint-cli advertises", () => {
  const version = readFileSync(new URL("../../../MintCLI/VersionCommand.swift", import.meta.url), "utf8");
  const approval = readFileSync(new URL("../../../Mint/Integrations/NativeMCPApproval.swift", import.meta.url), "utf8");
  assert.ok(version.includes(`"${NATIVE_APPROVAL_CAPABILITY}"`));
  assert.ok(approval.includes(`raycastCapability = "${NATIVE_APPROVAL_CAPABILITY}"`));
});

test("every action the new commands change is one Mint confirms for Raycast", () => {
  const approval = readFileSync(new URL("../../../Mint/Integrations/NativeMCPApproval.swift", import.meta.url), "utf8");
  // The set's own literal: other sets in the file (an agent's Optimize, 2026-11-07) name actions Raycast does not send.
  const start = approval.indexOf("raycastActions: Set<String>");
  const listed = approval.slice(start, approval.indexOf("]", start) + 1);
  const sent = ["agents.delete", "agents.optimize", "agents.remove-media", "agent.optimize", "disk.trash.remove", "disk.compress",
    "pictures.keep", "pictures.remove", "organize.remove", "rules.add", "rules.update", "rules.enable", "rules.disable",
    "rules.remove", "handling.set"];
  for (const action of sent) assert.ok(listed.includes(`"${action}"`), action);
  // Shipped before 1.2: they keep Raycast's own confirmation.
  for (const action of ["disk.clean", "disk.optimize", "memory.release", "uninstall.execute", "organize.add", "organize.configure",
    "organize.run", "autocare.disk", "autocare.folder", "autocare.memory", "undo.execute"]) {
    assert.ok(!listed.includes(`"${action}"`), action);
  }
});

test("a person's No in Mint's window answers declined; a Stop stays cancelled", () => {
  const approval = readFileSync(new URL("../../../Mint/Integrations/NativeMCPApproval.swift", import.meta.url), "utf8");
  assert.ok(approval.includes("case approved, declined, cancelled, expired"));
  assert.ok(approval.includes("@objc private func cancelled() { finish(.declined) }"));
  assert.ok(approval.includes("func windowShouldClose(_ sender: NSWindow) -> Bool { finish(.declined); return false }"));
  assert.ok(approval.includes("if self.isCancelled() || !interactiveSessionAvailable { self.finish(.cancelled); return }"));
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

// The 2026-11-05 VM run (11050712-4ff48f97): rules.add from the form answered
// "The surface request is not valid JSON." because Mint decodes `icon` as
// required and the rule had none. Every key Mint's decoder requires is sent.
test("a rule from the form carries every key Mint's decoder requires", () => {
  const config = readFileSync(new URL("../../../Mint/Models/AppConfig.swift", import.meta.url), "utf8");
  const rule = config.slice(config.indexOf("struct DeclutterRule:"));
  const start = rule.indexOf("init(from decoder: Decoder)");
  const decoder = rule.slice(start, rule.indexOf("\n    }\n", start));
  const required = [...decoder.matchAll(/(\w+) = try c\.decode\(\w+\.self, forKey: \.(\w+)\)/g)].map((match) => match[2]);
  assert.deepEqual(required.sort(), ["enabled", "icon", "id", "name"]);
  const sent = JSON.parse(JSON.stringify(customRule(draft, "custom-1").rule)) as Record<string, unknown>;
  for (const key of required) assert.ok(sent[key] !== undefined && sent[key] !== null, `${key} is sent`);
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
