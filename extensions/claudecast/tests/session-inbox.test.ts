import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getDefaultSessionInboxLocations,
  loadConductorSessionRecords,
  loadDesktopSessionRecords,
  loadSupplementalSessionMetadata,
  mergeSessionInboxMetadata,
} from "../src/lib/session-inbox.ts";

async function fixture(t: test.TestContext) {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-session-inbox-"),
  );
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("reads bounded Claude Desktop metadata windows", async (t) => {
  const projectCwd =
    process.platform === "win32" ? "C:\\work\\alpha" : "/work/alpha";
  const root = await fixture(t);
  const nested = path.join(root, "account", "device");
  await fs.promises.mkdir(nested, { recursive: true });
  const metadataPath = path.join(nested, "local_desktop-one.json");
  await fs.promises.writeFile(
    metadataPath,
    JSON.stringify({
      sessionId: "local_desktop-one",
      cliSessionId: "cli-one",
      cwd: projectCwd,
      title: "Desktop Title",
      isArchived: true,
      enabledMcpTools: { ignored: "x".repeat(50_000) },
      bridgeSessionIds: ["cse_bridge-one"],
      scheduledTaskId: "daily-plan",
    }),
  );

  const records = await loadDesktopSessionRecords(root);
  assert.deepEqual(records, [
    {
      cliSessionId: "cli-one",
      localSessionId: "local_desktop-one",
      title: "Desktop Title",
      cwd: projectCwd,
      bridgeId: "cse_bridge-one",
      isArchived: true,
      scheduledTaskId: "daily-plan",
      metadataPath,
    },
  ]);
});

test("rejects missing and invalid Claude Desktop private fields", async (t) => {
  const root = await fixture(t);
  const values = [
    {
      file: "local_missing.json",
      value: { sessionId: "local_missing", title: "No CLI ID" },
    },
    {
      file: "local_mismatch.json",
      value: {
        sessionId: "local_other",
        cliSessionId: "cli-other",
      },
    },
    {
      file: "local_valid.json",
      value: {
        sessionId: "local_valid",
        cliSessionId: "cli-valid",
        cwd: "../../private",
        title: "x".repeat(501),
        bridgeSessionId: "https://invalid.example",
        isArchived: "true",
      },
    },
  ];
  for (const item of values) {
    await fs.promises.writeFile(
      path.join(root, item.file),
      JSON.stringify(item.value),
    );
  }

  const records = await loadDesktopSessionRecords(root);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    cliSessionId: "cli-valid",
    localSessionId: "local_valid",
    title: undefined,
    cwd: undefined,
    bridgeId: undefined,
    isArchived: undefined,
    scheduledTaskId: undefined,
    metadataPath: path.join(root, "local_valid.json"),
  });
});

test("bounds Claude Desktop discovery and ignores symlink escapes", async (t) => {
  const root = await fixture(t);
  const outside = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-session-private-"),
  );
  t.after(async () => {
    await fs.promises.rm(outside, { recursive: true, force: true });
  });
  for (let index = 0; index < 3; index++) {
    await fs.promises.writeFile(
      path.join(root, `local_${index}.json`),
      JSON.stringify({
        sessionId: `local_${index}`,
        cliSessionId: `cli-${index}`,
      }),
    );
  }
  const outsideFile = path.join(outside, "local_escape.json");
  await fs.promises.writeFile(
    outsideFile,
    JSON.stringify({ sessionId: "local_escape", cliSessionId: "escape" }),
  );
  await fs.promises.symlink(outsideFile, path.join(root, "local_escape.json"));

  const records = await loadDesktopSessionRecords(root, { maxFiles: 2 });
  assert.equal(records.length, 2);
  assert.deepEqual(
    records.map((record) => record.cliSessionId),
    ["cli-0", "cli-1"],
  );
});

test("validates Conductor rows and preserves deterministic duplicates", async () => {
  const records = await loadConductorSessionRecords("/tmp/conductor.db", {
    query: async () => [
      {
        claude_session_id: "same-session",
        title: "Archived Copy",
        workspace_id: "workspace-z",
        workspace_path: "/work/z",
        workspace_state: "archived",
        private_token: "ignored",
      },
      {
        claude_session_id: "same-session",
        title: "Active Copy",
        workspace_id: "workspace-a",
        workspace_path: "/work/a",
        workspace_state: "ready",
      },
      {
        claude_session_id: "../invalid",
        workspace_path: "/private",
      },
      {
        claude_session_id: "missing-fields",
        title: "Untitled",
        workspace_path: "relative/path",
        workspace_state: "unknown",
      },
    ],
  });

  assert.deepEqual(
    records.map((record) => [record.title, record.state]),
    [
      ["Active Copy", "active"],
      ["Archived Copy", "archived"],
    ],
  );
});

test("merges CLI, Desktop, VS Code, and Conductor identities", async (t) => {
  const root = await fixture(t);
  const desktopRoot = path.join(root, "desktop");
  await fs.promises.mkdir(desktopRoot);
  const desktopPath = path.join(desktopRoot, "local_desktop.json");
  await fs.promises.writeFile(
    desktopPath,
    JSON.stringify({
      sessionId: "local_desktop",
      cliSessionId: "shared-session",
      title: "Desktop Session",
      bridgeSessionId: "session_bridge",
    }),
  );
  const supplemental = await loadSupplementalSessionMetadata({
    desktopRoot,
    conductorDatabase: path.join(root, "conductor.db"),
    queryConductor: async () => [
      {
        claude_session_id: "shared-session",
        title: "Conductor Session",
        workspace_id: "workspace-one",
        workspace_path: "/work/alpha",
        workspace_state: "ready",
      },
    ],
  });
  const metadata = mergeSessionInboxMetadata(
    "shared-session",
    path.join(root, "projects", "shared-session.jsonl"),
    "/work/alpha",
    "claude-vscode",
    supplemental,
  );

  assert.deepEqual(
    metadata.sources.map((source) => source.backend),
    ["claude-cli", "vscode", "claude-desktop", "conductor"],
  );
  assert.equal(metadata.title, "Desktop Session");
  assert.equal(metadata.desktopBridgeId, "session_bridge");
  assert.equal(metadata.conductorWorkspaceId, "workspace-one");
});

test("preserves native Windows paths and case-insensitive workspace joins", async () => {
  const locations = getDefaultSessionInboxLocations("C:\\Users\\Me", "win32", {
    AppData: "D:\\Roaming",
  });
  assert.equal(
    locations.desktopRoot,
    "D:\\Roaming\\Claude\\claude-code-sessions",
  );

  const supplemental = await loadSupplementalSessionMetadata({
    platform: "win32",
    conductorDatabase: "C:\\Data\\conductor.db",
    queryConductor: async () => [
      {
        claude_session_id: "other-session",
        workspace_id: "workspace-win",
        workspace_path: "C:\\Work\\Alpha",
        workspace_state: "ready",
      },
    ],
  });
  const metadata = mergeSessionInboxMetadata(
    "session-win",
    "C:\\Users\\Me\\.claude\\projects\\alpha\\session-win.jsonl",
    "c:\\work\\alpha",
    "cli",
    supplemental,
    "win32",
  );
  assert.equal(metadata.sources.at(-1)?.backend, "conductor");
  assert.equal(metadata.workspacePath, "C:\\Work\\Alpha");
});

test("cancels private metadata discovery", async (t) => {
  const root = await fixture(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loadDesktopSessionRecords(root, { signal: controller.signal }),
    { name: "AbortError" },
  );
  await assert.rejects(
    loadConductorSessionRecords(path.join(root, "conductor.db"), {
      signal: controller.signal,
      query: async () => [],
    }),
    { name: "AbortError" },
  );
});
