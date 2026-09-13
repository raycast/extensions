import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BlumeSearchClient } from "./helperProcessClient.ts";
import { helperLaunchForApplication } from "./helperLaunch.ts";

test("Raycast launches the helper shipped inside Blume with its bundled Node runtime", () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-app-"));
  const applicationPath = join(directory, "Blume.app");
  const executable = join(applicationPath, "Contents", "MacOS", "Blume");
  const helper = join(applicationPath, "Contents", "Resources", "app.asar", "out", "main", "raycastSearch.js");
  mkdirSync(join(applicationPath, "Contents", "MacOS"), { recursive: true });
  mkdirSync(join(applicationPath, "Contents", "Resources", "app.asar", "out", "main"), {
    recursive: true,
  });
  writeFileSync(executable, "");
  writeFileSync(helper, "");
  try {
    const launch = helperLaunchForApplication({
      name: "Blume",
      path: applicationPath,
      bundleId: "page.blume.sidecar",
    });
    assert.equal(launch.command, executable);
    assert.deepEqual(launch.args, [helper]);
    assert.equal(launch.env.ELECTRON_RUN_AS_NODE, "1");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Raycast reports an outdated Blume app without the helper", () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-old-app-"));
  try {
    assert.throws(
      () =>
        helperLaunchForApplication({
          name: "Blume",
          path: join(directory, "Blume.app"),
          bundleId: "page.blume.sidecar",
        }),
      /does not include Raycast search yet/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Raycast preserves a helper failure that happens before the first search", async () => {
  const client = new BlumeSearchClient({
    command: join(tmpdir(), "missing-blume-search-helper"),
    args: [],
    env: process.env,
  });
  await assert.rejects(client.ready(), /ENOENT|spawn/);
  await assert.rejects(client.search({ query: "project", categories: ["projects"] }), /ENOENT|spawn/);
});

test("Raycast rejects a malformed helper response through the controlled error path", async () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-invalid-response-"));
  const script = join(directory, "helper.mjs");
  writeFileSync(
    script,
    `process.stdout.write(JSON.stringify({ version: 1, type: "ready", supportedVersions: [1] }) + "\\n");\nprocess.stdin.once("data", () => process.stdout.write("null\\n"));\n`,
  );
  const client = new BlumeSearchClient({ command: process.execPath, args: [script], env: process.env });
  try {
    await client.ready();
    await assert.rejects(client.search({ query: "project", categories: ["projects"] }), /invalid response/);
  } finally {
    client.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Raycast falls back to the additive legacy v1 helper protocol", async () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-legacy-helper-"));
  const script = join(directory, "helper.mjs");
  writeFileSync(
    script,
    `process.stdin.once("data", (chunk) => { const request = JSON.parse(String(chunk)); process.stdout.write(JSON.stringify({ version: 1, type: "search-result", id: request.id, ok: true, page: { results: [], truncated: false } }) + "\\n"); });\n`,
  );
  const client = new BlumeSearchClient({ command: process.execPath, args: [script], env: process.env });
  try {
    await client.ready();
    assert.deepEqual(await client.search({ query: "project", categories: ["projects"] }), {
      results: [],
      truncated: false,
    });
  } finally {
    client.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Raycast rejects oversized requests before writing to the helper", async () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-request-limit-"));
  const script = join(directory, "helper.mjs");
  writeFileSync(
    script,
    `process.stdout.write(JSON.stringify({ version: 1, type: "ready", supportedVersions: [1] }) + "\\n"); setTimeout(() => {}, 10_000);\n`,
  );
  const client = new BlumeSearchClient({ command: process.execPath, args: [script], env: process.env });
  try {
    await client.ready();
    await assert.rejects(
      client.search({ query: "x".repeat(9 * 1024), categories: ["projects"] }),
      /request is too large/,
    );
  } finally {
    client.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
});
