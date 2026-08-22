import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createGroundcrewClient,
  GroundcrewClientError,
  MINIMUM_GROUNDCREW_VERSION,
  resolveCrewExecutable,
  type GroundcrewPullRequest,
} from "../cli";

interface FakeResponse {
  delayMs?: number;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
}

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "groundcrew-raycast-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function makeFakeCrew(
  directory: string,
  responses: Record<string, FakeResponse>,
  name = "crew",
): Promise<{ environment: NodeJS.ProcessEnv; executablePath: string; logPath: string }> {
  await mkdir(directory, { recursive: true });
  const executablePath = path.join(directory, name);
  const logPath = path.join(directory, `${name}.argv.jsonl`);
  const source = `#!${process.execPath}
import { appendFileSync } from "node:fs";

const argv = process.argv.slice(2);
const logPath = process.env.FAKE_CREW_LOG;
if (logPath) appendFileSync(logPath, JSON.stringify(argv) + "\\n");
const responses = JSON.parse(process.env.FAKE_CREW_RESPONSES ?? "{}");
const response = responses[JSON.stringify(argv)];
if (!response) {
  process.stderr.write("Unexpected argv: " + JSON.stringify(argv));
  process.exit(64);
}
if (response.stdout) process.stdout.write(response.stdout);
if (response.stderr) process.stderr.write(response.stderr);
const finish = () => process.exit(response.exitCode ?? 0);
if (response.delayMs === undefined) finish();
else setTimeout(finish, response.delayMs);
`;
  await writeFile(executablePath, source);
  await chmod(executablePath, 0o755);
  return {
    environment: {
      ...process.env,
      FAKE_CREW_LOG: logPath,
      FAKE_CREW_RESPONSES: JSON.stringify(responses),
    },
    executablePath,
    logPath,
  };
}

function responseKey(...argv: string[]): string {
  return JSON.stringify(argv);
}

async function readArgvLog(logPath: string): Promise<string[][]> {
  const contents = await readFile(logPath, "utf8");
  return contents
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

const task = {
  id: "linear:tem-3894",
  source: "linear",
  title: "Implement client",
  description: "Use argv arrays.",
  status: "in-progress",
  repository: "ClipboardHealth/groundcrew-raycast",
  agent: "codex",
  assignee: "Shubham",
  updatedAt: "2026-08-20T08:00:00.000Z",
  blockers: [],
  hasMoreBlockers: false,
  url: "https://linear.app/clipboard/issue/TEM-3894",
  priority: 1,
};

const legacyStatus = {
  local: {
    schemaVersion: 1,
    capturedAt: "2026-08-20T08:01:00.000Z",
    logCursor: { device: 1, inode: 2, offset: 3 },
    maximumInProgress: 3,
    workspaceProbe: { status: "ok" },
    tasks: [
      {
        task: "tem-3894",
        title: "Implement client",
        url: "https://linear.app/clipboard/issue/TEM-3894",
        agent: "codex",
        lifecycle: "running",
        flags: [],
        startedAt: "2026-08-20T07:00:00.000Z",
        updatedAt: "2026-08-20T08:00:00.000Z",
        resumeCount: 1,
        session: "live",
        worktrees: [
          {
            repository: "groundcrew-raycast",
            kind: "host",
            dir: "/work/groundcrew-raycast-tem-3894",
            branch: "shubhsherl-tem-3894",
            git: { kind: "clean" },
          },
        ],
        recentLogLines: ["started"],
      },
    ],
    orphanedSessions: [],
  },
  remote: {
    schemaVersion: 1,
    lastAttemptAt: "2026-08-20T08:01:01.000Z",
    lastAttemptStatus: "ok",
    payload: {
      capturedAt: "2026-08-20T08:00:59.000Z",
      sourceByTask: {
        "tem-3894": {
          id: "linear:tem-3894",
          naturalId: "tem-3894",
          title: "Implement client",
          url: "https://linear.app/clipboard/issue/TEM-3894",
          repository: "ClipboardHealth/groundcrew-raycast",
          agent: "codex",
          status: "in-progress",
        },
      },
      inProgress: [
        {
          id: "linear:tem-3894",
          naturalId: "tem-3894",
          title: "Implement client",
        },
        {
          id: "linear:tem-4000",
          naturalId: "tem-4000",
          title: "Remote only",
        },
      ],
      queueReady: [
        {
          id: "linear:tem-3894",
          naturalId: "tem-3894",
          title: "Stale queue copy",
          repository: "ClipboardHealth/groundcrew-raycast",
          agent: "codex",
        },
      ],
      queueBlocked: [],
    },
    lastAttemptError: undefined as string | undefined,
    pullRequestsByWorktree: {
      "/work/groundcrew-raycast-tem-3894": [
        {
          url: "https://github.com/ClipboardHealth/groundcrew-raycast/pull/2",
          number: 2,
          state: "open",
          title: "Implement client",
        },
      ],
    } as Record<string, GroundcrewPullRequest[]>,
  },
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("crew executable discovery", () => {
  it("uses preference, PATH, Homebrew, then the newest installed nvm Node bin", async () => {
    const root = await makeTemporaryDirectory();
    const preferred = await makeFakeCrew(path.join(root, "preferred"), {});
    const pathCrew = await makeFakeCrew(path.join(root, "path"), {});
    const homebrewCrew = await makeFakeCrew(path.join(root, "homebrew"), {});
    const nvmOlder = await makeFakeCrew(path.join(root, ".nvm/versions/node/v20.1.0/bin"), {});
    const nvmNewer = await makeFakeCrew(path.join(root, ".nvm/versions/node/v22.3.0/bin"), {});

    await expect(
      resolveCrewExecutable({
        configuredPath: preferred.executablePath,
        environment: { PATH: path.dirname(pathCrew.executablePath) },
        homeDirectory: root,
        homebrewPaths: [homebrewCrew.executablePath],
      }),
    ).resolves.toBe(preferred.executablePath);
    await expect(
      resolveCrewExecutable({
        environment: { PATH: path.dirname(pathCrew.executablePath) },
        homeDirectory: root,
        homebrewPaths: [homebrewCrew.executablePath],
      }),
    ).resolves.toBe(pathCrew.executablePath);
    await expect(
      resolveCrewExecutable({
        environment: { PATH: "" },
        homeDirectory: root,
        homebrewPaths: [homebrewCrew.executablePath],
      }),
    ).resolves.toBe(homebrewCrew.executablePath);
    await expect(
      resolveCrewExecutable({ environment: { PATH: "" }, homeDirectory: root, homebrewPaths: [] }),
    ).resolves.toBe(nvmNewer.executablePath);
    expect(nvmOlder.executablePath).not.toBe(nvmNewer.executablePath);
  });

  it("rejects relative, missing, and non-executable preferences with typed errors", async () => {
    const root = await makeTemporaryDirectory();
    const missing = path.join(root, "missing-crew");
    const nonExecutable = path.join(root, "crew");
    await writeFile(nonExecutable, "not executable");

    await expect(resolveCrewExecutable({ configuredPath: "crew" })).rejects.toMatchObject({
      code: "INVALID_EXECUTABLE_PREFERENCE",
    });
    await expect(resolveCrewExecutable({ configuredPath: missing })).rejects.toMatchObject({
      code: "EXECUTABLE_NOT_FOUND",
    });
    await expect(resolveCrewExecutable({ configuredPath: nonExecutable })).rejects.toMatchObject({
      code: "EXECUTABLE_NOT_EXECUTABLE",
    });
  });
});

describe("client startup and task JSON", () => {
  it("checks the minimum compatible SemVer and parses list/get JSON", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("task", "list", "--json")]: { stdout: JSON.stringify([task]) },
      [responseKey("task", "get", "TEM-3894", "--json")]: { stdout: JSON.stringify(task) },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.listTasks()).resolves.toEqual([task]);
    await expect(client.getTask("TEM-3894")).resolves.toEqual(task);
    const argv = await readArgvLog(fake.logPath);
    // The version check runs concurrently with the first data call, so its position
    // relative to the first command is unspecified; assert presence and data order.
    expect(argv.filter((entry) => entry[0] === "--version")).toEqual([["--version"]]);
    expect(argv.filter((entry) => entry[0] !== "--version")).toEqual([
      ["task", "list", "--json"],
      ["task", "get", "TEM-3894", "--json"],
    ]);
  });

  it.each([
    ["4.50.2", "INCOMPATIBLE_VERSION"],
    ["Groundcrew 4.50.3", "MALFORMED_VERSION"],
  ])("rejects version output %s on first use", async (version, code) => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${version}\n` },
    });
    // The client resolves immediately; the version is validated on the first command.
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.getStatus()).rejects.toMatchObject({ code });
  });

  it("runs doctor without a version gate", async () => {
    const root = await makeTemporaryDirectory();
    // No `--version` response: doctor must run even when the CLI is incompatible.
    const fake = await makeFakeCrew(root, {
      [responseKey("doctor")]: { stdout: "groundcrew doctor\n[ok] config loaded\n" },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.runDoctor()).resolves.toMatchObject({
      kind: "success",
      stdout: "groundcrew doctor\n[ok] config loaded\n",
    });
    await expect(readArgvLog(fake.logPath)).resolves.toEqual([["doctor"]]);
  });

  it("rejects malformed JSON and command-specific shape mismatches", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("task", "list", "--json")]: { stdout: "not json" },
      [responseKey("task", "get", "TEM-3894", "--json")]: { stdout: "[]" },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.listTasks()).rejects.toMatchObject({ code: "MALFORMED_JSON" });
    await expect(client.getTask("TEM-3894")).rejects.toMatchObject({ code: "INVALID_JSON_SHAPE" });
  });
});

describe("legacy status adapter", () => {
  it("uses only the full inventory, joins source/PR data, preserves health, and filters naturally", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("status", "--json")]: { stdout: JSON.stringify(legacyStatus) },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    const status = await client.getStatus("TEM-3894");

    expect(status.localCapturedAt).toBe("2026-08-20T08:01:00.000Z");
    expect(status.remote).toMatchObject({
      capturedAt: "2026-08-20T08:00:59.000Z",
      lastAttemptAt: "2026-08-20T08:01:01.000Z",
      lastAttemptStatus: "ok",
    });
    expect(status.tasks).toHaveLength(1);
    expect(status.tasks[0]?.source?.status).toBe("in-progress");
    expect(status.tasks[0]?.worktrees[0]?.pullRequests[0]?.number).toBe(2);
    expect(status.inProgressWithoutWorktree).toEqual([]);
    expect(status.queueReady).toEqual([]);
    const argv = await readArgvLog(fake.logPath);
    expect(argv.filter((entry) => entry[0] === "--version")).toEqual([["--version"]]);
    expect(argv.filter((entry) => entry[0] !== "--version")).toEqual([["status", "--json"]]);
  });

  it("rejects an unknown legacy schema version", async () => {
    const root = await makeTemporaryDirectory();
    const mismatched = structuredClone(legacyStatus);
    mismatched.remote.schemaVersion = 2;
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("status", "--json")]: { stdout: JSON.stringify(mismatched) },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.getStatus()).rejects.toMatchObject({ code: "STATUS_SCHEMA_MISMATCH" });
  });

  it("retains an older remote payload after an unavailable attempt and leaves empty PR results ambiguous", async () => {
    const root = await makeTemporaryDirectory();
    const degraded = structuredClone(legacyStatus);
    degraded.remote.lastAttemptAt = "2026-08-20T09:00:00.000Z";
    degraded.remote.lastAttemptStatus = "unavailable";
    degraded.remote.lastAttemptError = "GitHub and board refresh timed out";
    degraded.remote.payload.capturedAt = "2026-08-20T07:00:00.000Z";
    degraded.remote.pullRequestsByWorktree["/work/groundcrew-raycast-tem-3894"] = [];
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("status", "--json")]: { stdout: JSON.stringify(degraded) },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    const status = await client.getStatus();

    expect(status.remote).toEqual({
      capturedAt: "2026-08-20T07:00:00.000Z",
      lastAttemptAt: "2026-08-20T09:00:00.000Z",
      lastAttemptStatus: "unavailable",
      lastAttemptError: "GitHub and board refresh timed out",
    });
    expect(status.queueReady).toEqual([]);
    expect(status.inProgressWithoutWorktree).toHaveLength(1);
    expect(status.tasks[0]?.worktrees[0]?.pullRequests).toEqual([]);
    expect(status.slots).toEqual({ used: 2, maximum: 3 });
    const argv = await readArgvLog(fake.logPath);
    expect(argv.filter((entry) => entry[0] === "--version")).toEqual([["--version"]]);
    expect(argv.filter((entry) => entry[0] !== "--version")).toEqual([["status", "--json"]]);
  });

  it("preserves local workspaces when an unavailable remote attempt has no payload", async () => {
    const root = await makeTemporaryDirectory();
    const unavailable = structuredClone(legacyStatus);
    unavailable.remote.lastAttemptAt = "2026-08-20T09:30:00.000Z";
    unavailable.remote.lastAttemptStatus = "unavailable";
    unavailable.remote.lastAttemptError = "Board unavailable";
    unavailable.remote.pullRequestsByWorktree = {};
    const withoutPayload = {
      ...unavailable,
      remote: {
        schemaVersion: unavailable.remote.schemaVersion,
        lastAttemptAt: unavailable.remote.lastAttemptAt,
        lastAttemptStatus: unavailable.remote.lastAttemptStatus,
        lastAttemptError: unavailable.remote.lastAttemptError,
        pullRequestsByWorktree: unavailable.remote.pullRequestsByWorktree,
      },
    };
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("status", "--json")]: { stdout: JSON.stringify(withoutPayload) },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    const status = await client.getStatus();

    expect(status.tasks).toHaveLength(1);
    expect(status.tasks[0]?.source).toBeUndefined();
    expect(status.tasks[0]?.worktrees[0]?.pullRequests).toEqual([]);
    expect(status.inProgressWithoutWorktree).toEqual([]);
    expect(status.queueReady).toEqual([]);
    expect(status.queueBlocked).toEqual([]);
    expect(status.slots).toBeUndefined();
    expect(status.remote).toEqual({
      lastAttemptAt: "2026-08-20T09:30:00.000Z",
      lastAttemptStatus: "unavailable",
      lastAttemptError: "Board unavailable",
    });
  });

  it("rejects a blank natural task ID before loading status", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.getStatus("   ")).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    // The blank argument is rejected before any crew process spawns, including the version
    // check, so no argv log is ever written.
    const argv = await readArgvLog(fake.logPath).catch(() => []);
    expect(argv).toEqual([]);
  });
});

describe("lifecycle process results", () => {
  it("passes task IDs and reasons only as argv elements and captures opaque diagnostics", async () => {
    const root = await makeTemporaryDirectory();
    const marker = path.join(root, "shell-was-used");
    const unsafeTask = `TEM-3894; touch ${marker}`;
    const unsafeReason = `paused because $(touch ${marker})`;
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("stop", unsafeTask, "--reason", unsafeReason)]: {
        stdout: "human lifecycle text\n",
        stderr: "opaque warning\n",
      },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.stopTask(unsafeTask, { reason: unsafeReason })).resolves.toEqual({
      kind: "success",
      exitCode: 0,
      stdout: "human lifecycle text\n",
      stderr: "opaque warning\n",
    });
    expect(existsSync(marker)).toBe(false);
    await expect(readArgvLog(fake.logPath)).resolves.toContainEqual(["stop", unsafeTask, "--reason", unsafeReason]);
  });

  it("distinguishes non-zero failure, timeout, cancellation, and launch failure", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("start", "failure")]: { exitCode: 7, stderr: "could not start\n" },
      [responseKey("cleanup", "slow")]: { delayMs: 10_000, stderr: "cleanup began\n" },
      [responseKey("resume", "cancel-me")]: { delayMs: 10_000, stderr: "resume began\n" },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await expect(client.startTask("failure")).resolves.toMatchObject({
      kind: "failure",
      exitCode: 7,
      stderr: "could not start\n",
    });
    await expect(client.cleanupTask("slow", { timeoutMs: 150 })).resolves.toMatchObject({
      kind: "timeout",
      stderr: "cleanup began\n",
    });

    const controller = new AbortController();
    const cancellation = client.resumeTask("cancel-me", { signal: controller.signal });
    setTimeout(() => controller.abort(), 150);
    await expect(cancellation).resolves.toMatchObject({
      kind: "canceled",
      stderr: "resume began\n",
    });

    await unlink(fake.executablePath);
    await expect(client.startTask("missing-now")).resolves.toMatchObject({
      kind: "launch-failure",
    });
    const argv = await readArgvLog(fake.logPath);
    expect(argv.filter((entry) => entry[0] === "--version")).toEqual([["--version"]]);
    expect(argv.filter((entry) => entry[0] !== "--version")).toEqual([
      ["start", "failure"],
      ["cleanup", "slow"],
      ["resume", "cancel-me"],
    ]);
  });
});

describe("workspace and completion commands", () => {
  it("maps open, resume --new, and task done to argv", async () => {
    const root = await makeTemporaryDirectory();
    const fake = await makeFakeCrew(root, {
      [responseKey("--version")]: { stdout: `${MINIMUM_GROUNDCREW_VERSION}\n` },
      [responseKey("open", "123")]: { stdout: "" },
      [responseKey("open", "--branch", "feature/x")]: { stdout: "" },
      [responseKey("resume", "--new", "tem-1")]: { stdout: "" },
      [responseKey("task", "done", "tem-1")]: { stdout: "" },
    });
    const client = await createGroundcrewClient({
      executablePath: fake.executablePath,
      environment: fake.environment,
    });

    await client.openWorkspace("123");
    await client.openWorkspace("feature/x", { kind: "branch" });
    await client.resumeTask("tem-1", { newSession: true });
    await client.completeTask("tem-1");

    const argv = await readArgvLog(fake.logPath);
    expect(argv.filter((entry) => entry[0] !== "--version")).toEqual([
      ["open", "123"],
      ["open", "--branch", "feature/x"],
      ["resume", "--new", "tem-1"],
      ["task", "done", "tem-1"],
    ]);
  });
});

describe("typed errors", () => {
  it("exposes a stable error class", () => {
    const error = new GroundcrewClientError("EXECUTABLE_NOT_FOUND", "missing");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("EXECUTABLE_NOT_FOUND");
  });
});
