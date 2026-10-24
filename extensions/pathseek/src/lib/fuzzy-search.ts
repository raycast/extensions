import { spawn } from "node:child_process";
import { beginCommandTrace } from "./command-trace";
import { openIndexDataStream } from "./index-files";
import { appendFzfOutputChunk, createFzfOutputState } from "./fzf-output";
import {
  findBinary,
  getPreferences,
  indexFilePath,
  type IndexMetadata,
} from "./index-store";

/**
 * 仅搜索已经持久化的索引；此函数不会运行 fd 或遍历目录树。
 */
export async function fuzzySearch(
  index: IndexMetadata,
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!query.trim()) return [];
  if (signal?.aborted) return [];

  const binary = await findBinary("fzf", getPreferences().fzfBinary);
  const input = await openIndexDataStream(indexFilePath(index));
  // Actual argv contains the search query; never write it to the trace.
  const trace = await beginCommandTrace(
    "fzf",
    "fuzzy-query",
    "fzf --extended --read0 --print0 --filter <redacted>",
  );
  let exitCode: number | null | undefined;
  let wasLimited = false;

  try {
    const output = await new Promise<string[]>((resolve, reject) => {
      const outputState = createFzfOutputState();
      let limited = false;
      let stderr = "";
      let finished = false;

      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        input.destroy();
        if (error) reject(error);
        else resolve(outputState.results);
      };

      const child = spawn(
        binary,
        ["--extended", "--read0", "--print0", "--filter", query],
        {
          stdio: ["pipe", "pipe", "pipe"],
          signal,
        },
      );

      input.on("error", (error) => {
        child.kill();
        finish(error);
      });
      child.stdin.on("error", (error: NodeJS.ErrnoException) => {
        // 到达结果上限并结束 fzf 时，输入流可能出现预期的 EPIPE。
        if (error.code !== "EPIPE" && !limited && !signal?.aborted)
          finish(error);
      });
      input.pipe(child.stdin);

      child.stdout.on("data", (data: Buffer) => {
        if (limited) return;
        appendFzfOutputChunk(outputState, data);
        if (outputState.limitReached) {
          limited = true;
          wasLimited = true;
          // This intentional stop may yield exitCode=null (SIGTERM).
          child.kill();
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        if (stderr.length < 4096) stderr += data.toString("utf8");
      });

      child.once("error", (error) => {
        if (signal?.aborted) finish();
        else finish(error);
      });

      child.once("close", (code) => {
        exitCode = code;
        if (
          signal?.aborted ||
          limited ||
          code === 0 ||
          (code === 1 && !stderr)
        ) {
          finish();
        } else {
          finish(new Error(`fzf failed (exit ${code}): ${stderr.trim()}`));
        }
      });
    });
    await trace?.finish(
      signal?.aborted ? "cancelled" : wasLimited ? "limit-reached" : "success",
      output.length,
      exitCode,
    );
    return output;
  } catch (error) {
    await trace?.finish(
      signal?.aborted ? "cancelled" : "failure",
      undefined,
      exitCode,
      error,
    );
    throw error;
  }
}
