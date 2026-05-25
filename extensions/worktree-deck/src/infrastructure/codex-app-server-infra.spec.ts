import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CodexInitialSessionMetadata } from "../application/start-codex-initial-session.usecase";
import {
  buildCodexThreadStartParams,
  buildCodexTurnStartParams,
  loadCodexInitialSessionDefaultsFromGlobalConfig,
} from "./codex-app-server-infra";

const DEFAULT_METADATA: CodexInitialSessionMetadata = {
  model: "gpt-5.5",
  serviceTier: "default",
  reasoningEffort: "medium",
  approvalPolicy: "on-request",
  sandboxMode: "workspace-write",
  approvalsReviewer: "user",
  webSearch: "cached",
};

let codexHomeForTest: string | null = null;
const originalCodexHome = process.env.CODEX_HOME;

afterEach(async () => {
  if (codexHomeForTest) {
    await rm(codexHomeForTest, { recursive: true, force: true });
    codexHomeForTest = null;
  }
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }
});

/**
 * テスト用の Codex config を作成する
 */
async function writeCodexConfigForTest(source: string): Promise<void> {
  codexHomeForTest = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
  process.env.CODEX_HOME = codexHomeForTest;
  await writeFile(join(codexHomeForTest, "config.toml"), source);
}

describe("loadCodexInitialSessionDefaultsFromGlobalConfig", () => {
  it("config.toml の service_tier fast を既定値として読む", async () => {
    await writeCodexConfigForTest('service_tier = "fast"\n');

    const result = await loadCodexInitialSessionDefaultsFromGlobalConfig({ repoRoot: "/repos/app" });

    expect(result.serviceTier).toBe("fast");
  });

  it("service_tier が未設定なら default にフォールバックする", async () => {
    await writeCodexConfigForTest('model = "gpt-5.5"\n');

    const result = await loadCodexInitialSessionDefaultsFromGlobalConfig({ repoRoot: "/repos/app" });

    expect(result.serviceTier).toBe("default");
  });

  it("service_tier が未知値なら default にフォールバックする", async () => {
    await writeCodexConfigForTest('service_tier = "unknown"\n');

    const result = await loadCodexInitialSessionDefaultsFromGlobalConfig({ repoRoot: "/repos/app" });

    expect(result.serviceTier).toBe("default");
  });
});

describe("buildCodexThreadStartParams", () => {
  it("thread/start payload に serviceTier fast を渡す", () => {
    expect(
      buildCodexThreadStartParams({
        worktreePath: "/worktrees/app",
        metadata: { ...DEFAULT_METADATA, serviceTier: "fast" },
      }),
    ).toMatchObject({
      cwd: "/worktrees/app",
      serviceTier: "fast",
    });
  });

  it("thread/start payload に serviceTier default を明示して渡す", () => {
    expect(
      buildCodexThreadStartParams({
        worktreePath: "/worktrees/app",
        metadata: { ...DEFAULT_METADATA, serviceTier: "default" },
      }),
    ).toMatchObject({
      cwd: "/worktrees/app",
      serviceTier: "default",
    });
  });
});

describe("buildCodexTurnStartParams", () => {
  it("turn/start payload に serviceTier fast を渡す", () => {
    expect(
      buildCodexTurnStartParams({
        threadId: "thread-1",
        initialPrompt: "Fix focus",
        metadata: { ...DEFAULT_METADATA, serviceTier: "fast" },
      }),
    ).toMatchObject({
      threadId: "thread-1",
      serviceTier: "fast",
      effort: "medium",
    });
  });

  it("turn/start payload に serviceTier default を明示して渡す", () => {
    expect(
      buildCodexTurnStartParams({
        threadId: "thread-1",
        initialPrompt: "Fix focus",
        metadata: { ...DEFAULT_METADATA, serviceTier: "default" },
      }),
    ).toMatchObject({
      threadId: "thread-1",
      serviceTier: "default",
      effort: "medium",
    });
  });
});
