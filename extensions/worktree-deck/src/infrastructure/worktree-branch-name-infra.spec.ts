import { writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import { generateBranchNameWithCodexExec } from "./worktree-branch-name-infra";

describe("generateBranchNameWithCodexExec", () => {
  it("codex exec を指定モデルと reasoning effort で実行し最終メッセージを返す", async () => {
    const codexExecRunnerMock = vi.fn(async (args: string[]) => {
      const outputPath = args[args.indexOf("--output-last-message") + 1];
      if (!outputPath) {
        throw new Error("output path is required");
      }
      await writeFile(outputPath, "fix/focus-edge\n", "utf8");
      return { stdout: "stdout branch", stderr: "" };
    });

    const result = await generateBranchNameWithCodexExec(
      {
        repoRoot: "/repos/app-a",
        prompt: "Generate branch",
      },
      codexExecRunnerMock,
    );

    expect(codexExecRunnerMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        "exec",
        "--sandbox",
        "read-only",
        "--ephemeral",
        "-m",
        "gpt-5.3-codex-spark",
        "-c",
        'approval_policy="never"',
        "-c",
        'model_reasoning_effort="xhigh"',
        "-C",
        "/repos/app-a",
      ]),
      expect.objectContaining({
        cwd: "/repos/app-a",
        maxBuffer: 1024 * 1024 * 10,
        timeoutMs: 60_000,
      }),
      "Generate branch",
    );
    const calledArgs = codexExecRunnerMock.mock.calls[0]?.[0] ?? [];
    expect(calledArgs.at(-1)).toBe("-");
    expect(calledArgs).not.toContain("Generate branch");
    expect(result).toBe("fix/focus-edge");
  });

  it("最終メッセージが空なら stdout を返す", async () => {
    const codexExecRunnerMock = vi.fn(async () => ({ stdout: "fix/from-stdout", stderr: "" }));

    const result = await generateBranchNameWithCodexExec(
      {
        repoRoot: "/repos/app-a",
        prompt: "Generate branch",
      },
      codexExecRunnerMock,
    );

    expect(result).toBe("fix/from-stdout");
  });
});
