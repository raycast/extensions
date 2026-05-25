import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => {
  const spawn = vi.fn();
  return { spawn };
});

vi.mock("node:child_process", () => {
  return {
    spawn: childProcessMocks.spawn,
  };
});

import { startWorktreeAutoStartJob } from "./worktree-auto-start-job-store";

/**
 * テスト用の Auto Start job 入力を準備する
 */
async function createAutoStartJobFixture(): Promise<{
  rootDir: string;
  storageDir: string;
  scriptPath: string;
  workerPath: string;
}> {
  const rootDir = await mkdtemp(join(tmpdir(), "worktree-auto-start-job-"));
  const storageDir = join(rootDir, ".worktree-deck", "storage");
  const assetsDir = join(rootDir, "assets");
  const scriptPath = join(assetsDir, "git_worktree_wrap.sh");
  const workerPath = join(assetsDir, "auto_start_worker.js");
  await mkdir(assetsDir, { recursive: true });
  await writeFile(scriptPath, "#!/bin/sh\n", "utf8");
  await writeFile(workerPath, "#!/usr/bin/env node\n", "utf8");
  vi.stubEnv("HOME", rootDir);
  return { rootDir, storageDir, scriptPath, workerPath };
}

/**
 * spawn の成功 child mock を設定する
 */
function mockSuccessfulSpawn(): void {
  const child = {
    once: vi.fn(),
    unref: vi.fn(),
  };
  child.once.mockReturnValue(child);
  childProcessMocks.spawn.mockReturnValue(child);
}

describe("startWorktreeAutoStartJob", () => {
  const createdRoots: string[] = [];

  afterEach(async () => {
    childProcessMocks.spawn.mockReset();
    vi.unstubAllEnvs();
    await Promise.all(createdRoots.map((path) => rm(path, { recursive: true, force: true })));
    createdRoots.length = 0;
  });

  it("worker には payload 全体ではなく statePath だけを渡す", async () => {
    const fixture = await createAutoStartJobFixture();
    createdRoots.push(fixture.rootDir);
    mockSuccessfulSpawn();

    const result = await startWorktreeAutoStartJob({
      repoRoot: "/repos/app-a",
      baseBranch: "main",
      initialPrompt: "a".repeat(5000),
      imagePaths: ["/tmp/design.png"],
      scriptPath: fixture.scriptPath,
      mapValue: "app-a",
      openApp: "zed",
      metadata: {
        model: "gpt-5.5",
        serviceTier: "default",
        reasoningEffort: "medium",
        approvalPolicy: "on-request",
        sandboxMode: "workspace-write",
        approvalsReviewer: "user",
        webSearch: "cached",
      },
    });

    expect(childProcessMocks.spawn).toHaveBeenCalledWith(
      process.execPath,
      [fixture.workerPath, result.statePath],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      }),
    );
    const state = JSON.parse(await readFile(result.statePath, "utf8")) as Record<string, unknown>;
    expect(state.initialPrompt).toBe("a".repeat(5000));
    expect(state.imagePaths).toEqual(["/tmp/design.png"]);
  });

  it("worker 起動失敗時は state を failed に更新する", async () => {
    const fixture = await createAutoStartJobFixture();
    createdRoots.push(fixture.rootDir);
    const child = {
      once: vi.fn((event: string, callback: (error: Error) => void) => {
        if (event === "error") {
          process.nextTick(() => callback(new Error("spawn failed")));
        }
        return child;
      }),
      unref: vi.fn(),
    };
    childProcessMocks.spawn.mockReturnValue(child);

    await expect(
      startWorktreeAutoStartJob({
        repoRoot: "/repos/app-a",
        baseBranch: "main",
        initialPrompt: "Fix startup error",
        scriptPath: fixture.scriptPath,
        mapValue: "app-a",
        openApp: "zed",
        metadata: {
          model: "gpt-5.5",
          serviceTier: "default",
          reasoningEffort: "medium",
          approvalPolicy: "on-request",
          sandboxMode: "workspace-write",
          approvalsReviewer: "user",
          webSearch: "cached",
        },
      }),
    ).rejects.toThrow("spawn failed");

    const stateFiles = await readdir(join(fixture.storageDir, "auto-start-jobs"));
    expect(stateFiles).toHaveLength(1);
    const statePath = join(fixture.storageDir, "auto-start-jobs", stateFiles[0]);
    const state = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
    expect(state.status).toBe("failed");
    expect(state.errorMessage).toBe("spawn failed");
  });
});
