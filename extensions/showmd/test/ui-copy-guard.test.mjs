import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
);

test("Raycast avoids instance/server wording in user-facing metadata", () => {
  const manage = manifest.commands.find(
    (command) => command.name === "manage-server",
  );
  assert.ok(
    manage,
    "manage-server command id is part of the extension contract",
  );
  assert.equal(manage.title, "Manage ShowMD");
  assert.doesNotMatch(manage.description, /instance|server/i);

  const port = manifest.preferences.find(
    (preference) => preference.name === "port",
  );
  assert.ok(port);
  assert.match(port.description, /preferred port/i);
  assert.match(port.description, /other ports/i);
  assert.doesNotMatch(port.description, /instance|must match/i);

  const status = manifest.tools.find((tool) => tool.name === "server-status");
  assert.ok(status);
  assert.equal(status.title, "ShowMD Status");
  assert.doesNotMatch(status.description, /instance|server/i);
});

test("Manage and settings views avoid instance/server in their visible start/status copy", () => {
  const manage = readFileSync(path.join(ROOT, "src/manage-server.tsx"), "utf8");
  const settings = readFileSync(
    path.join(ROOT, "src/edit-settings.tsx"),
    "utf8",
  );
  assert.match(manage, /Could not load ShowMD status/);
  assert.match(manage, /title="Start ShowMD"/);
  assert.match(settings, /ShowMD is not running/);
  assert.match(settings, /title="Start ShowMD"/);
});
