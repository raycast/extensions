import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import type { GenerateWorktreeBranchNameRequest } from "../application/generate-worktree-branch-name.usecase";
import { normalizeExternalCommandError } from "./external-command-error";

/**
 * branch 名生成で使う Codex モデル
 */
const BRANCH_NAME_CODEX_MODEL = "gpt-5.3-codex-spark";

/**
 * branch 名生成で使う reasoning effort
 */
const BRANCH_NAME_REASONING_EFFORT = "xhigh";

/**
 * Codex コマンドの出力上限
 */
const CODEX_EXEC_MAX_BUFFER = 1024 * 1024 * 10;

/**
 * Codex exec のタイムアウト
 */
const CODEX_EXEC_TIMEOUT_MS = 60_000;

/**
 * Codex exec 実行関数
 */
type CodexExecRunner = (
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; maxBuffer: number; timeoutMs: number },
  input: string,
) => Promise<{ stdout: string; stderr: string }>;

/**
 * 文字列を maxBuffer 以内に蓄積する
 */
function appendOutput(args: { current: string; chunk: Buffer | string; maxBuffer: number; label: string }): string {
  const next = args.current + args.chunk.toString();
  if (Buffer.byteLength(next) > args.maxBuffer) {
    throw new Error(`${args.label} maxBuffer exceeded.`);
  }
  return next;
}

/**
 * codex exec を stdin を閉じて実行する
 */
async function runCodexExec(
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; maxBuffer: number; timeoutMs: number },
  input: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    /**
     * 子プロセス失敗時の後始末を一箇所で行う
     */
    const finishReject = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      child.kill("SIGTERM");
      reject(error);
    };
    const timeout = setTimeout(() => {
      finishReject(new Error("Codex branch name generation timed out."));
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      try {
        stdout = appendOutput({ current: stdout, chunk, maxBuffer: options.maxBuffer, label: "stdout" });
      } catch (error) {
        finishReject(error);
      }
    });
    child.stderr.on("data", (chunk) => {
      try {
        stderr = appendOutput({ current: stderr, chunk, maxBuffer: options.maxBuffer, label: "stderr" });
      } catch (error) {
        finishReject(error);
      }
    });
    child.stdin.on("error", (error) => {
      finishReject(error);
    });
    child.on("error", (error) => {
      finishReject(normalizeExternalCommandError(error, "codex", "codex-action"));
    });
    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`Codex branch name generation failed: ${stderr.trim() || signal || `exit ${code}`}`));
    });
    child.stdin.end(input);
  });
}

/**
 * PATHに追加する代表的な検索ディレクトリ
 */
const DEFAULT_COMMAND_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];

/**
 * codex コマンド探索用 PATH を組み立てる
 */
function buildCommandPath(currentPath?: string): string {
  const segments = new Set((currentPath ?? "").split(delimiter).filter((segment) => segment.trim().length > 0));
  for (const path of DEFAULT_COMMAND_PATHS) {
    segments.add(path);
  }
  return Array.from(segments).join(delimiter);
}

/**
 * Codex exec の最終メッセージ出力パスを引数から探す
 */
function findOutputLastMessagePath(args: string[]): string | null {
  const index = args.indexOf("--output-last-message");
  if (index === -1) {
    return null;
  }
  return args[index + 1]?.trim() || null;
}

/**
 * Codex exec の出力から branch 名生成結果を読み取る
 */
async function readCodexBranchNameResult(args: { outputPath: string; fallbackStdout: string }): Promise<string> {
  try {
    const output = await readFile(args.outputPath, "utf8");
    const trimmed = output.trim();
    if (trimmed) {
      return trimmed;
    }
  } catch {
    // Codex が最終メッセージファイルを書けなかった場合は stdout を利用する。
  }
  return args.fallbackStdout;
}

/**
 * Codex exec で初期プロンプトから branch 名を生成する
 */
export async function generateBranchNameWithCodexExec(
  request: GenerateWorktreeBranchNameRequest,
  codexExecRunner: CodexExecRunner = runCodexExec,
): Promise<string> {
  const repoRoot = request.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository is required.");
  }
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "worktree-deck-branch-"));
  const outputPath = join(tempDir, "branch.txt");
  const codexArgs = [
    "exec",
    "--sandbox",
    "read-only",
    "--ephemeral",
    "-m",
    BRANCH_NAME_CODEX_MODEL,
    "-c",
    'approval_policy="never"',
    "-c",
    `model_reasoning_effort="${BRANCH_NAME_REASONING_EFFORT}"`,
    "-C",
    repoRoot,
    "--output-last-message",
    outputPath,
    "-",
  ];

  try {
    const { stdout } = await codexExecRunner(
      codexArgs,
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PATH: buildCommandPath(process.env.PATH),
        },
        maxBuffer: CODEX_EXEC_MAX_BUFFER,
        timeoutMs: CODEX_EXEC_TIMEOUT_MS,
      },
      prompt,
    );
    return readCodexBranchNameResult({
      outputPath: findOutputLastMessagePath(codexArgs) ?? outputPath,
      fallbackStdout: stdout,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
