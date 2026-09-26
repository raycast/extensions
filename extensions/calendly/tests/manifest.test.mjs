import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function entryPointNames(directory) {
  return readdirSync(new URL(directory, import.meta.url))
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => file.replace(/\.(ts|tsx)$/, ""))
    .sort();
}

test("every Calendly command is registered as a view, including the legacy command", () => {
  assert.deepEqual(manifest.commands.map((command) => command.name).sort(), entryPointNames("../src/"));
  assert.ok(manifest.commands.some((command) => command.name === "calendly"));
  for (const command of manifest.commands) {
    assert.equal(command.mode, "view", `${command.name} must open a view`);
  }
});

test("every Calendly AI tool is registered with a title and description", () => {
  const tools = manifest.tools ?? [];
  assert.deepEqual(tools.map((tool) => tool.name).sort(), entryPointNames("../src/tools/"));
  for (const tool of tools) {
    assert.ok(tool.title?.trim(), `${tool.name} needs a title`);
    assert.ok(tool.description?.trim(), `${tool.name} needs a description`);
  }
});
