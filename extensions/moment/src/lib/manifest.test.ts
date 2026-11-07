// The manifest, the AI file and the Store's files, as the ticket fixes them.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { test } from "node:test";
import { COMMAND_FILE_NAMES, COMMAND_TITLES as SIRI_TITLES, COMMANDS, type Command } from "./timer.ts";

// `npm test` runs from the extension's root. (No import.meta: tsconfig's module is commonjs.)
const ROOT = process.cwd();

type ManifestArgument = { name: string; type: string; required?: boolean };
type ManifestCommand = { name: string; title: string; subtitle?: string; mode: string; arguments?: ManifestArgument[] };
type ManifestTool = { name: string; title: string; description: string };
type Manifest = Record<string, unknown> & {
  commands: ManifestCommand[];
  tools: ManifestTool[];
  scripts: Record<string, string>;
};
type Eval = { input: string; mocks?: Record<string, Record<string, unknown>>; expected: unknown[] };
type AI = { instructions: string; evals: Eval[] };

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as Manifest;
const ai = JSON.parse(readFileSync(join(ROOT, "ai.json"), "utf8")) as AI;

const takesMinutes = (command: Command) => command === "startFocus" || command === "addTime";

test("manifest_identity_isMomentForTheStore", () => {
  assert.equal(manifest.name, "moment");
  assert.equal(manifest.title, "Moment");
  assert.equal(manifest.author, "milosz_falinski");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.icon, "icon.png");
  assert.deepEqual(manifest.categories, ["Productivity"]);
});

test("manifest_platforms_areMacOSOnly", () => {
  assert.deepEqual(manifest.platforms, ["macOS"]);
});

test("manifest_commands_areSirisSixNoViewCommands", () => {
  assert.deepEqual(
    manifest.commands.map(({ name, title, subtitle, mode }) => ({ name, title, subtitle, mode })),
    COMMANDS.map((command) => ({
      name: COMMAND_FILE_NAMES[command],
      title: SIRI_TITLES[command],
      subtitle: "Moment",
      mode: "no-view",
    })),
  );
});

for (const command of COMMANDS) {
  test(`manifest_${COMMAND_FILE_NAMES[command]}_takesAnOptionalMinutesArgumentOnlyIfItTakesMinutes`, () => {
    const entry = manifest.commands.find((candidate) => candidate.name === COMMAND_FILE_NAMES[command]);
    const expected = takesMinutes(command) ? [{ name: "minutes", type: "text", required: false }] : undefined;
    assert.deepEqual(
      entry?.arguments?.map(({ name, type, required }) => ({ name, type, required })),
      expected,
    );
  });
}

test("manifest_tools_areTheSameSixWithDescriptions", () => {
  assert.deepEqual(
    manifest.tools.map(({ name, title }) => ({ name, title })),
    COMMANDS.map((command) => ({ name: COMMAND_FILE_NAMES[command], title: SIRI_TITLES[command] })),
  );
  for (const tool of manifest.tools) assert.ok(tool.description.length > 0, tool.name);
});

test("manifest_build_writesInsideTheFolderNeverIntoRaycastsOwn", () => {
  assert.match(manifest.scripts.build, /^ray build -e dist -o dist$/);
});

test("manifest_scripts_lintAndTestAsTheTicketSays", () => {
  assert.equal(manifest.scripts.lint, "ray lint");
  assert.match(manifest.scripts.test, /^node --test /);
});

test("manifest_noPreferencesOrMenuBarCommand", () => {
  assert.equal(manifest.preferences, undefined);
  for (const command of manifest.commands) assert.equal((command as Record<string, unknown>).preferences, undefined);
});

test("ai_instructions_sayItIsMomentsFocusTimerAndNeverInvent", () => {
  assert.match(ai.instructions, /^Moment is a focus timer/);
  assert.match(ai.instructions, /Never choose a length for the person\./);
  assert.match(ai.instructions, /never invent an intention\./);
});

test("ai_instructions_sayTheToolsCantReadSessionsStatsOrIntentions", () => {
  assert.match(
    ai.instructions,
    / The tools can't read past sessions, Stats or intentions\. When the person asks about them, say so\./,
  );
});

test("ai_evals_mentionTheExtensionAndCallEveryTool", () => {
  for (const entry of ai.evals) assert.match(entry.input, /^@moment /);
  const called = JSON.stringify(ai.evals.map((entry) => entry.expected));
  for (const tool of manifest.tools) assert.ok(called.includes(`"${tool.name}"`), tool.name);
});

test("ai_evalMocks_answerOnlyWhatAToolReturns", () => {
  const tools = new Set(manifest.tools.map((tool) => tool.name));
  for (const entry of ai.evals) {
    for (const [tool, mock] of Object.entries(entry.mocks ?? {})) {
      assert.ok(tools.has(tool), tool);
      assert.deepEqual(Object.keys(mock).sort(), ["durationSeconds", "kind", "state", "timeLeftSeconds"]);
    }
  }
});

/** Every file the Store receives: the folder without its ignored build products. */
function storeFiles(folder = ROOT): string[] {
  return readdirSync(folder).flatMap((name) => {
    if (["node_modules", "dist", "raycast-env.d.ts", ".DS_Store"].includes(name)) return [];
    const path = join(folder, name);
    return statSync(path).isDirectory() ? storeFiles(path) : [path];
  });
}

test("store_noFileSaysPomodoro", () => {
  for (const path of storeFiles().filter((file) => !file.endsWith(".png"))) {
    if (path.endsWith("manifest.test.ts")) continue;
    assert.doesNotMatch(readFileSync(path, "utf8"), /pomodoro/i, relative(ROOT, path));
  }
});

test("store_noProFeatureOrUpsellInTheExtension", () => {
  const files = [join(ROOT, "package.json"), join(ROOT, "ai.json"), ...storeFiles(join(ROOT, "src"))];
  for (const path of files.filter((file) => !file.endsWith("manifest.test.ts"))) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /\bPro\b|paywall|subscri|purchase|upgrade/i, relative(ROOT, path));
  }
});

test("store_readmeAndChangelogArePresent", () => {
  assert.ok(existsSync(join(ROOT, "README.md")));
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /^# Moment Changelog\n\n## \[Initial Version\] - \{PR_MERGE_DATE\}\n/);
});

// FF-1318 (the Store's review): raycast/extensions' own MIT licence covers
// every extension, so the manifest's "license": "MIT" stands alone.
test("store_noLicenseFile_theRepositorysLicenceCoversTheExtension", () => {
  const licences = storeFiles().filter((path) => /^licen[cs]e(\.|$)/i.test(basename(path)));
  assert.deepEqual(
    licences.map((path) => relative(ROOT, path)),
    [],
  );
});

for (const name of ["icon.png", "icon@dark.png"]) {
  test(`store_${name}_isA512By512PNG`, () => {
    const png = readFileSync(join(ROOT, "assets", name));
    assert.deepEqual([...png.subarray(1, 4)], [...Buffer.from("PNG")]);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [512, 512]);
  });
}

test("store_gitignoreKeepsBuildProductsOut", () => {
  const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8").split("\n");
  for (const name of ["node_modules", "dist", "raycast-env.d.ts"]) assert.ok(ignored.includes(name), name);
});

// `ray build` writes each tool's JSON schema from its types: what Raycast AI is
// promised. Checked when a build exists (npm run build first).
const BUILT = join(ROOT, "dist", "package.json");

test("build_everyToolsOutput_isOnlyStateKindTimeLeftAndLength", { skip: !existsSync(BUILT) }, () => {
  const built = JSON.parse(readFileSync(BUILT, "utf8")) as { tools: (ManifestTool & Record<string, unknown>)[] };
  assert.equal(built.tools.length, COMMANDS.length);
  for (const tool of built.tools) {
    const output = tool.output as { properties: Record<string, unknown>; required: string[] };
    assert.deepEqual(Object.keys(output.properties).sort(), ["durationSeconds", "kind", "state", "timeLeftSeconds"]);
    assert.equal(tool.confirmation, tool.name !== "time-left", tool.name);
  }
});
