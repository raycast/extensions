import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
test("DayCal display branding preserves the installed extension identity", () => {
  assert.equal(manifest.title, "DayCal");
  assert.equal(manifest.name, "calendar-shortcuts-google");
  assert.equal(manifest.icon, "daycal.png");
  assert.ok(existsSync(new URL(`../assets/${manifest.icon}`, import.meta.url)));
  assert.ok(existsSync(new URL("../assets/daycal@dark.png", import.meta.url)));
  assert.doesNotMatch(JSON.stringify(manifest.commands), /CalFlow/);
});

test("Store-facing manifest hides internal helper commands", () => {
  const commandNames = manifest.commands.map((command) => command.name);
  for (const internalName of [
    "event-actions",
    "check-connection",
    "refresh-diagnostics",
    "test-quick-add-parsing",
    "reset-onboarding",
  ]) {
    assert.ok(!commandNames.includes(internalName), `${internalName} must not be exposed in the public manifest`);
  }
  assert.ok(manifest.commands.every((command) => command.subtitle !== "Development"));
});
test("native source surfaces do not reintroduce CalFlow display text", () => {
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.tsx?$/.test(path)) assert.doesNotMatch(readFileSync(path, "utf8"), /CalFlow/, path);
    }
  }
  check(new URL("../src", import.meta.url).pathname);
});
