import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Auto Start worker asset の内容を読み込む
 */
async function readAutoStartWorkerAsset(): Promise<string> {
  return readFile(join(process.cwd(), "assets", "auto_start_worker.js"), "utf8");
}

describe("auto_start_worker.js", () => {
  it("Codex app-server の local image 入力形式を使う", async () => {
    const source = await readAutoStartWorkerAsset();

    expect(source).toContain('type: "localImage"');
    expect(source).not.toContain('type: "local_image"');
  });

  it("thread/start と turn/start に serviceTier を渡す", async () => {
    const source = await readAutoStartWorkerAsset();

    expect(source.match(/serviceTier: payload\.metadata\.serviceTier \|\| "default"/g)).toHaveLength(2);
  });

  it("生成タイトルを Codex thread の表示名へ反映する", async () => {
    const source = await readAutoStartWorkerAsset();

    expect(source).toContain('client.request("thread/name/set"');
    expect(source).toContain("name: normalizedTitle");
    expect(source).toContain('"Failed to set Codex thread title"');
  });

  it("完了通知には worktree path ではなく branch と title を表示する", async () => {
    const source = await readAutoStartWorkerAsset();

    expect(source).toContain(
      "function formatCompletionNotificationMessage(branch, sessionTitle, branchGenerationWarning)",
    );
    expect(source).toContain("Branch: ${branch}");
    expect(source).toContain("Title: ${sessionTitle}");
    expect(source).toContain(
      'notify("Auto Start completed", formatCompletionNotificationMessage(branch, sessionTitle, branchGenerationWarning))',
    );
    expect(source).not.toContain(
      'notify("Auto Start completed", branchGenerationWarning ? `Used fallback branch: ${branch}` : worktreePath)',
    );
  });

  it("外部依存未導入時の英語案内文を state に残せる", async () => {
    const source = await readAutoStartWorkerAsset();

    expect(source).toContain("Git is required to manage worktrees. Install Git and ensure it is available in PATH.");
    expect(source).toContain(
      "Codex CLI is required for Codex actions. Install Codex and ensure it is available in PATH.",
    );
    expect(source).toContain("normalizeMissingCommandError(error, command)");
  });
});
