import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = process.cwd();
const workRoot = path.join(repoRoot, "local-verification");
const fixtureRoot = path.join(workRoot, "local-verification-fixtures");
const distRoot = path.join(workRoot, "local-verification-dist");

await rm(fixtureRoot, { recursive: true, force: true });
await rm(distRoot, { recursive: true, force: true });
await mkdir(fixtureRoot, { recursive: true });
await mkdir(distRoot, { recursive: true });

await verifyCommandEntryPoints();
await verifyBlockSetPreferences();
await verifyMarkdownFileListing();
await verifyPreview();
await verifyDynamicPlaceholdersExpansion();

console.log("local verification passed");

async function verifyCommandEntryPoints() {
  const packageJson = JSON.parse(await readText("package.json"));

  for (const command of packageJson.commands ?? []) {
    const entryPoint = path.join(repoRoot, "src", `${command.name}.tsx`);
    await assertFileExists(entryPoint);
  }
}

async function verifyBlockSetPreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  for (const index of [1, 2, 3]) {
    assert.equal(preferences[`folder${index}Enabled`].type, "checkbox");
    assert.equal(preferences[`folder${index}Enabled`].title, `Block Set ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].label, `Enable Block Set ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].default, true);
    assert.equal(preferences[`folder${index}Enabled`].required, false);
    assert.equal(preferences[`folder${index}Directory`].type, "directory");
    assert.equal(preferences[`folder${index}Directory`].required, false);
    assert.equal(preferences[`folder${index}DisplayName`].type, "textfield");
    assert.equal(preferences[`folder${index}DisplayName`].required, false);
  }
}

async function verifyPreviewPreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  assert.equal(preferences.showPreview, undefined);
  assert.equal(preferences.previewLineCount.type, "textfield");
  assert.equal(preferences.previewLineCount.default, "10");
  assert.equal(preferences.previewMaxCharacters.type, "textfield");
  assert.equal(preferences.previewMaxCharacters.default, "4000");
}

async function verifyMarkdownFileListing() {
  const outputFile = path.join(distRoot, "markdownFiles.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "markdownFiles.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const { listBlockFiles, listBlockFilesFromBlockSets } = await import(pathToFileURL(outputFile));
  const blockRoot = path.join(fixtureRoot, "blocks");
  const secondBlockRoot = path.join(fixtureRoot, "second-blocks");
  const missingBlockRoot = path.join(fixtureRoot, "missing-blocks");
  await mkdir(path.join(blockRoot, "nested"), { recursive: true });
  await mkdir(path.join(blockRoot, ".hidden"), { recursive: true });
  await mkdir(path.join(blockRoot, ".git"), { recursive: true });
  await mkdir(path.join(blockRoot, "node_modules"), { recursive: true });
  await mkdir(secondBlockRoot, { recursive: true });
  await writeFile(path.join(blockRoot, "a.md"), "# A\n");
  await writeFile(path.join(blockRoot, "nested", "b.MD"), "# B\n");
  await writeFile(path.join(blockRoot, "c.txt"), "C\n");
  await writeFile(path.join(blockRoot, ".hidden", "hidden.md"), "hidden\n");
  await writeFile(path.join(blockRoot, ".git", "ignored.md"), "git\n");
  await writeFile(path.join(blockRoot, "node_modules", "ignored.md"), "node_modules\n");
  await writeFile(path.join(secondBlockRoot, "second.md"), "# Second\n");

  const files = await listBlockFiles({
    id: 1,
    commandTitle: "Block Set 1",
    displayName: "Fixture",
    directory: blockRoot,
  });

  assert.deepEqual(
    files.map((file) => file.relativePath),
    ["a.md", path.join("nested", "b.MD")],
  );
  assert(files.every((file) => file.blockSet.displayName === "Fixture"));
  assert(files.every((file) => file.size > 0));
  assert(files.every((file) => file.updatedAt instanceof Date));

  const combinedResult = await listBlockFilesFromBlockSets([
    {
      id: 1,
      commandTitle: "Block Set 1",
      displayName: "Fixture",
      directory: blockRoot,
    },
    {
      id: 2,
      commandTitle: "Block Set 2",
      displayName: "Missing Fixture",
      directory: missingBlockRoot,
    },
    {
      id: 3,
      commandTitle: "Block Set 3",
      displayName: "Second Fixture",
      directory: secondBlockRoot,
    },
  ]);

  assert.deepEqual(
    combinedResult.files.map((file) => file.relativePath),
    ["a.md", path.join("nested", "b.MD"), "second.md"],
  );
  assert.equal(combinedResult.failures.length, 1);
  assert.equal(combinedResult.failures[0].blockSet.displayName, "Missing Fixture");
  assert.match(combinedResult.failures[0].message, /ENOENT|no such file/i);

  const notDirectoryPath = path.join(fixtureRoot, "not-directory.md");
  await writeFile(notDirectoryPath, "# Not Directory\n");

  await assert.rejects(
    () =>
      listBlockFiles({
        id: 1,
        commandTitle: "Block Set 1",
        displayName: "Not Directory",
        directory: notDirectoryPath,
      }),
    /is not a directory/,
  );
}

async function verifyPreview() {
  await verifyPreviewPreferences();

  const outputFile = path.join(distRoot, "preview.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "preview.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const { readBlockPreview } = await import(pathToFileURL(outputFile));
  const previewFilePath = path.join(fixtureRoot, "preview.md");
  await writeFile(previewFilePath, ["line1", "line2", "line3", "line4"].join("\n"));

  assert.equal(await readBlockPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), "line1\nline2");
  assert.equal(await readBlockPreview(previewFilePath, { lineCount: 10, maxCharacters: 8 }), "line1\nli");
}

async function verifyDynamicPlaceholdersExpansion() {
  const outputFile = path.join(distRoot, "dynamicPlaceholders.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "dynamicPlaceholders.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
    plugins: [
      {
        name: "raycast-api-stub",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^@raycast\/api$/ }, () => ({
            path: "raycast-api-stub",
            namespace: "raycast-api-stub",
          }));
          pluginBuild.onLoad({ filter: /.*/, namespace: "raycast-api-stub" }, () => ({
            contents: `
globalThis.__localCopyBlocksClipboardReadCount = 0;
export const Clipboard = {
  readText: async () => {
    globalThis.__localCopyBlocksClipboardReadCount += 1;
    return "CLIPBOARD_TEXT";
  },
};
`,
            loader: "js",
          }));
        },
      },
    ],
  });

  const { expandDynamicPlaceholders } = await import(pathToFileURL(outputFile));
  const expanded = await expandDynamicPlaceholders(
    "date={date}\ntime={time}\ndatetime={datetime}\nday={day}\ntimezone={timezone}\nnow={now}\nuuid_one={uuid}\nuuid_two={uuid}\nclipboard={clipboard}",
  );

  assert.match(expanded, /date=.+/);
  assert.match(expanded, /time=.+/);
  assert.match(expanded, /datetime=.+/);
  assert(!expanded.includes("datetime={datetime}"));
  assert(!expanded.includes("day={day}"));
  assert.match(expanded, /timezone=(.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("timezone={timezone}"));
  assert.match(expanded, /now=.+ (.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("now={now}"));
  const uuidMatches = expanded.match(/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/g);
  assert.equal(uuidMatches?.length, 2);
  assert.notEqual(uuidMatches[0], uuidMatches[1]);
  assert.match(expanded, /clipboard=CLIPBOARD_TEXT/);
  assert(!expanded.includes("{date}"));
  assert(!expanded.includes("{clipboard}"));
  assert.equal(globalThis.__localCopyBlocksClipboardReadCount, 1);

  globalThis.__localCopyBlocksClipboardReadCount = 0;
  await expandDynamicPlaceholders("date={date}\ntimezone={timezone}");
  assert.equal(globalThis.__localCopyBlocksClipboardReadCount, 0);
}

async function readText(relativePath) {
  return await readFile(path.join(repoRoot, relativePath), "utf8");
}

async function assertFileExists(filePath) {
  await access(filePath);
}
