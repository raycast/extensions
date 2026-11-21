import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { describeCommand, prompts, sections } from "../src/commands.ts";

// The catalog teaches commands and default shortcuts, so it must match the reference it copies:
// Defi's CONFIGURATION.md, from DEFI_CONFIGURATION or a Defi checkout around this folder.
const referencePath = process.env.DEFI_CONFIGURATION ?? new URL("../../../CONFIGURATION.md", import.meta.url).pathname;
const skip = existsSync(referencePath) ? false : "set DEFI_CONFIGURATION to Defi's CONFIGURATION.md";
const rows = skip
  ? []
  : readFileSync(referencePath, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("| `"));
const entries = sections.flatMap(([, list]) => list);

test("every catalog command is a documented command with a description", { skip }, () => {
  for (const { command } of entries) {
    const verb = command.split(" ")[0];
    assert.ok(
      rows.some((row) => row.startsWith(`| \`${verb} `) || row.startsWith(`| \`${verb}\``)),
      `${verb} is not in CONFIGURATION.md`,
    );
    assert.match(describeCommand(command), /^[A-Z].+\.$/, `${command} has no description`);
  }
  assert.ok(prompts.every((prompt) => sections.some(([section]) => section === prompt.section)));
  // Each row says what it does itself, not what its whole command family does.
  const texts = entries.map((entry) => describeCommand(entry.command));
  assert.equal(new Set(texts).size, texts.length, "two rows share a description");
});

test("every default shortcut matches the documented one", { skip }, () => {
  for (const { command, shortcut } of entries.filter((entry) => entry.shortcut)) {
    const [verb, direction = ""] = command.split(" ");
    // A command can have one row per group of arguments, such as left|right and first|last.
    const row =
      rows.find((line) => {
        const cell = line.split("`")[1] ?? "";
        return cell.split(" ")[0] === verb && (!direction || cell.includes(direction));
      }) ?? "";
    // The reference writes the four directions of one binding as <arrow>.
    const general = shortcut!.replace(new RegExp(`-${direction}$`), "-<arrow>");
    assert.ok(
      row.includes(`\`${shortcut}\``) || row.includes(`\`${general}\``),
      `${command}: ${shortcut} is not its documented shortcut`,
    );
  }
});
