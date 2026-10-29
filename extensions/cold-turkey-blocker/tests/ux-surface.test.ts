import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  commands: Array<{
    name: string;
    title: string;
    disabledByDefault?: boolean;
    keywords?: string[];
  }>;
};
const manageBlocksSource = readFileSync("src/manage-blocks.tsx", "utf8");
const formSources = [
  "src/components/add-entry-form.tsx",
  "src/components/break-control-form.tsx",
  "src/components/create-block-form.tsx",
  "src/components/start-block-form.tsx",
  "src/components/stop-password-form.tsx",
].map((path) => readFileSync(path, "utf8"));

test("keeps Manage Cold Turkey as the only root command", () => {
  assert.deepEqual(
    manifest.commands.map((command) => command.name),
    ["manage-blocks"],
  );
  assert.equal(manifest.commands[0]?.title, "Manage Cold Turkey");
});

test("keeps removed command intents discoverable through Manage Cold Turkey", () => {
  const keywords = manifest.commands.find((command) => command.name === "manage-blocks")?.keywords ?? [];

  for (const keyword of [
    "start",
    "stop",
    "lock",
    "password",
    "break",
    "website",
    "exception",
    "add",
    "create",
    "device",
    "schedule",
  ]) {
    assert.ok(keywords.includes(keyword), `missing command keyword: ${keyword}`);
  }
});

test("uses unified forms instead of nested action submenus", () => {
  assert.doesNotMatch(manageBlocksSource, /ActionPanel\.Submenu/);
  assert.match(manageBlocksSource, /title="Start Options…"/);
  assert.match(manageBlocksSource, /title="Add Websites or Exceptions…"/);
  assert.match(manageBlocksSource, /title="Control Break…"/);
});

test("provides an in-command launch action for Cold Turkey", () => {
  assert.match(manageBlocksSource, /Action\.Open title="Open Cold Turkey"/);
  assert.match(manageBlocksSource, /coldTurkeyOpenTarget/);
});

test("confirms direct device schedule starts", () => {
  assert.match(manageBlocksSource, /confirmPotentialLock/);
  assert.match(manageBlocksSource, /Enable Schedule/);
});

test("uses native search instead of a redundant filter menu", () => {
  assert.doesNotMatch(manageBlocksSource, /List\.Dropdown/);
  assert.match(manageBlocksSource, /searchBarPlaceholder="Search by name, status, or block type…"/);
  assert.match(manageBlocksSource, /blockSearchKeywords/);
});

test("does not show the search placeholder while blocks are loading", () => {
  assert.match(manageBlocksSource, /const hasNoMatchingBlocks = !isLoading && blocks\.length > 0/);
});

test("does not duplicate refresh for unknown-status blocks", () => {
  assert.match(manageBlocksSource, /policy\.primaryAction !== "refresh"/);
});

test("keeps preferences out of routine forms", () => {
  for (const source of formSources) {
    assert.doesNotMatch(source, /openExtensionPreferences/);
  }
});

test("makes the unlocked start explicit in both fast and complete paths", () => {
  const source = readFileSync("src/components/start-block-form.tsx", "utf8");
  assert.match(manageBlocksSource, /"Start Unlocked"/);
  assert.match(manageBlocksSource, /"Enable Device Schedule \(No Lock\)"/);
  assert.match(source, /value="unlocked"/);
  assert.match(source, /title="Start Unlocked \(No Lock\)"/);
  assert.match(source, /mode === "unlocked" && blockKind !== "device"/);
  assert.match(source, /title="Use Saved Settings"/);
});

test("requests a stop password only after Cold Turkey reports that it is required", () => {
  const source = readFileSync("src/components/stop-password-form.tsx", "utf8");

  assert.doesNotMatch(manageBlocksSource, /title=.*Stop with Password/);
  assert.match(manageBlocksSource, /classifyStopPasswordError\(cliErrorText\(error\)\)/);
  assert.match(manageBlocksSource, /"password-required"/);
  assert.match(manageBlocksSource, /push\(\s*<StopPasswordForm/);
  assert.match(source, /navigationTitle="Password Required"/);
  assert.match(source, /"invalid-password"/);
  assert.match(source, /Cold Turkey rejected this password/);
});

test("lets website blocks be created with optional initial contents", () => {
  const source = readFileSync("src/components/create-block-form.tsx", "utf8");

  assert.match(source, /title="Website List \(Optional\)"/);
  assert.match(source, /title="Exception List \(Optional\)"/);
  assert.match(source, /"Create Block with Initial Contents"/);
  assert.match(source, /"Create Empty Block"/);
  assert.match(source, /"Create Device Block"/);
  assert.match(source, /leave both lists empty/);
  assert.match(source, /buildAddEntryArgs/);
  assert.match(source, /waitForBlockPresence/);
  assert.match(source, /kind === "website-app"/);
  assert.doesNotMatch(source, /pop\(\);\n\s*return;\n\s*}\n\s*\n\s*toast\.style = Toast\.Style\.Success/);
});
