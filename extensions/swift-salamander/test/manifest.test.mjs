import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("path destination is an extension preference", () => {
  const destination = manifest.preferences?.find(
    (preference) => preference.name === "pathTarget",
  );

  assert.deepEqual(destination, {
    name: "pathTarget",
    title: "Open Paths In",
    description: "Choose where path commands navigate in Swift Salamander.",
    type: "dropdown",
    required: true,
    default: "active",
    data: [
      { title: "Active Pane", value: "active" },
      { title: "Opposite Pane", value: "opposite" },
      { title: "New Tab", value: "new-tab" },
    ],
  });
});

test("command palette commands accept at most one argument", () => {
  for (const command of manifest.commands) {
    assert.ok(
      (command.arguments?.length ?? 0) <= 1,
      `${command.name} exposes more than one command-palette argument`,
    );
  }
});

test("Open Path asks only for a path", () => {
  const command = manifest.commands.find((candidate) => candidate.name === "open-path");
  assert.deepEqual(command?.arguments, [
    { name: "path", type: "text", placeholder: "Path, such as ~ or ~/Downloads", required: true },
  ]);
});

test("Store metadata follows Raycast's submission rules", () => {
  assert.equal(manifest.author, "c0desurfer");
  assert.equal(manifest.license, "MIT");
  assert.deepEqual(manifest.platforms, ["macOS"]);
  assert.deepEqual(manifest.categories, ["Applications", "Productivity"]);
  assert.equal(manifest.scripts.publish, "npx @raycast/api@latest publish");
});

test("preferences use Raycast Settings instead of a configuration command", () => {
  assert.equal(
    manifest.commands.some((command) => command.name === "integration-settings"),
    false,
  );
});

test("manifest-derived types stay the single source of truth", async () => {
  const sources = await Promise.all(
    ["salamander.ts", "open-path.ts", "open-workspace.ts"].map((name) =>
      readFile(new URL(`../src/${name}`, import.meta.url), "utf8"),
    ),
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /\b(?:type|interface)\s+(?:ExtensionPreferences|Arguments)\b/);
  }
  assert.match(sources[0], /getPreferenceValues<Preferences>/);
  assert.match(sources[1], /Arguments\.OpenPath/);
  assert.match(sources[2], /Arguments\.OpenWorkspace/);
});

test("the screenshot-free first release contains only no-view commands", () => {
  assert.deepEqual(
    manifest.commands.filter((command) => command.mode === "view"),
    [],
  );
});
