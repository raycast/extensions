import assert from "node:assert/strict";
import test from "node:test";

const cliPathsModulePath = "./cli-paths.ts";
const cliPathsModule = import(cliPathsModulePath) as Promise<
  typeof import("./cli-paths")
>;

const homeDirectory = "/Users/example";
const standalonePath = `${homeDirectory}/.codex/packages/standalone/current/codex`;

test("searches the bundled binary before the standalone install", async () => {
  const { buildCodexCliCandidatePaths } = await cliPathsModule;

  assert.deepEqual(buildCodexCliCandidatePaths(undefined, homeDirectory), [
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    standalonePath,
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    `${homeDirectory}/.local/bin/codex`,
  ]);
});

test("puts a configured path first", async () => {
  const { buildCodexCliCandidatePaths } = await cliPathsModule;

  assert.deepEqual(
    buildCodexCliCandidatePaths("/custom/codex", homeDirectory),
    [
      "/custom/codex",
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      standalonePath,
      "/opt/homebrew/bin/codex",
      "/usr/local/bin/codex",
      `${homeDirectory}/.local/bin/codex`,
    ],
  );
});

test("does not search a configured path twice", async () => {
  const { buildCodexCliCandidatePaths } = await cliPathsModule;
  const candidatePaths = buildCodexCliCandidatePaths(
    standalonePath,
    homeDirectory,
  );

  assert.deepEqual(candidatePaths, [
    standalonePath,
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    `${homeDirectory}/.local/bin/codex`,
  ]);
});

test("builds the standalone path under the given home directory", async () => {
  const { standaloneCodexCliPath } = await cliPathsModule;

  assert.equal(standaloneCodexCliPath(homeDirectory), standalonePath);
});
