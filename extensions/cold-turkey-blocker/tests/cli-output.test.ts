import assert from "node:assert/strict";
import test from "node:test";
import {
  blockKindMatchesExpected,
  classifyStopPasswordError,
  cleanCliOutput,
  compactCliOutput,
  decodeCliOutput,
  extractCliError,
  looksLikeCliError,
  looksLikeHelpOutput,
  parseBlockList,
  parseBlockNames,
  parseBlockState,
} from "../src/lib/cli-output";

test("cleans BOM, ANSI sequences, null bytes, and Windows line endings", () => {
  assert.equal(cleanCliOutput("\uFEFF\u001B[31mHello\u001B[0m\r\nW\0orld\r\n"), "Hello\nWorld");
});

test("decodes UTF-8 and UTF-16LE CLI output", () => {
  assert.equal(decodeCliOutput(Buffer.from("Enabled\r\n", "utf8")), "Enabled");
  assert.equal(
    decodeCliOutput(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Disabled\r\n", "utf16le")])),
    "Disabled",
  );
  assert.equal(decodeCliOutput(Buffer.from("Enabled\r\n", "utf16le")), "Enabled");
});

test("parses line-oriented block names", () => {
  assert.deepEqual(parseBlockNames('Blocks:\r\n1. Deep Work\r\n• "Social Media"\r\n- Frozen Turkey\r\n'), [
    "Deep Work",
    "Social Media",
    "Frozen Turkey",
  ]);
});

test("parses Cold Turkey 4.9 block sections without treating headings as blocks", () => {
  const output = [
    "Website & App Blocks",
    "World Wide Web",
    "Distractions",
    "stop coding",
    "",
    "Device Blocks",
    "Raycast_Test_SignOut",
    "Raycast_Test_Device",
    "Raycast_Test_ShutDown",
  ].join("\n");

  assert.deepEqual(parseBlockList(output), [
    { name: "World Wide Web", kind: "website-app" },
    { name: "Distractions", kind: "website-app" },
    { name: "stop coding", kind: "website-app" },
    { name: "Raycast_Test_SignOut", kind: "device" },
    { name: "Raycast_Test_Device", kind: "device" },
    { name: "Raycast_Test_ShutDown", kind: "device" },
  ]);
});

test("keeps plural block names instead of treating them as headings", () => {
  assert.deepEqual(parseBlockList("Website & App Blocks\nDeep Work\nStudy Blocks"), [
    { name: "Deep Work", kind: "website-app" },
    { name: "Study Blocks", kind: "website-app" },
  ]);
  assert.deepEqual(parseBlockList("Study Blocks"), [{ name: "Study Blocks", kind: "unknown" }]);
  assert.deepEqual(parseBlockList("Deep Work Block"), [{ name: "Deep Work Block", kind: "unknown" }]);
  assert.deepEqual(parseBlockList("Deep Work\n\nStudy Blocks"), [
    { name: "Deep Work", kind: "unknown" },
    { name: "Study Blocks", kind: "unknown" },
  ]);

  const sectionedOutput = ["Website & App Blocks", "Deep Work", "", "Study Blocks", "", "Device Blocks", "Laptop"].join(
    "\n",
  );

  assert.deepEqual(parseBlockList(sectionedOutput), [
    { name: "Deep Work", kind: "website-app" },
    { name: "Study Blocks", kind: "website-app" },
    { name: "Laptop", kind: "device" },
  ]);
});

test("skips unknown headings at section boundaries without inheriting the previous kind", () => {
  const output = [
    "Website & App Blocks",
    "Deep Work",
    "",
    "Focus Blocks",
    "Pomodoro",
    "",
    "Device Blocks",
    "Laptop",
  ].join("\n");

  assert.deepEqual(parseBlockList(output), [
    { name: "Deep Work", kind: "website-app" },
    { name: "Pomodoro", kind: "unknown" },
    { name: "Laptop", kind: "device" },
  ]);
});

test("accepts an unknown reported kind when verifying a created block", () => {
  assert.equal(blockKindMatchesExpected("unknown", "website-app"), true);
  assert.equal(blockKindMatchesExpected("unknown", "device"), true);
  assert.equal(blockKindMatchesExpected("website-app", "unknown"), true);
  assert.equal(blockKindMatchesExpected("website-app", "website-app"), true);
  assert.equal(blockKindMatchesExpected("device", "website-app"), false);
});

test("parses names when status is included", () => {
  assert.deepEqual(parseBlockNames("Deep Work: enabled\nSocial Media - disabled"), ["Deep Work", "Social Media"]);
});

test("parses a JSON string array if a future CLI returns one", () => {
  assert.deepEqual(parseBlockNames('["Deep Work", "Social Media"]'), ["Deep Work", "Social Media"]);
});

test("returns an empty list for no-blocks output", () => {
  assert.deepEqual(parseBlockNames("No blocks found."), []);
});

test("recognizes CLI help output", () => {
  assert.equal(
    looksLikeHelpOutput('-start "Block Name"\nStarts the specified block.\n-list-blocks\nDisplays all blocks.'),
    true,
  );
});

test("recognizes semantic CLI errors even if a process exits successfully", () => {
  assert.equal(looksLikeCliError("Error: Invalid block name. This block name is already used."), true);
  assert.equal(looksLikeCliError("=> Error: A lock is already set for this block."), true);
  assert.equal(
    extractCliError("=> Error: A lock is already set for this block."),
    "Error: A lock is already set for this block.",
  );
  assert.equal(looksLikeCliError("Enabled"), false);
});

test("classifies password-stop failures reported by Cold Turkey", () => {
  assert.equal(
    classifyStopPasswordError("Error: Invalid number of parameters to unlock password lock."),
    "password-required",
  );
  assert.equal(classifyStopPasswordError("=> Error: Invalid password provided."), "invalid-password");
  assert.equal(classifyStopPasswordError("Error: Wrong password."), "invalid-password");
  assert.equal(classifyStopPasswordError("Error: Password incorrect."), "invalid-password");
  assert.equal(classifyStopPasswordError("Error: Password required."), "password-required");
  assert.equal(classifyStopPasswordError("Error: This block cannot be stopped yet."), undefined);
});

test("parses common enabled and disabled status formats", () => {
  assert.equal(parseBlockState("enabled"), "enabled");
  assert.equal(parseBlockState("=> Enabled"), "enabled");
  assert.equal(parseBlockState("Deep Work is enabled."), "enabled");
  assert.equal(parseBlockState("Status: disabled"), "disabled");
  assert.equal(parseBlockState("OFF"), "disabled");
  assert.equal(parseBlockState("something unexpected"), "unknown");
  assert.equal(parseBlockState("Disabled\nScheduler note enabled"), "disabled");
});

test("compacts long output", () => {
  assert.equal(compactCliOutput("one\n\n two", 100), "one two");
  assert.equal(compactCliOutput("1234567890", 6), "12345…");
});
