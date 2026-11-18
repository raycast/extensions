import { execFile as execFileCb, type ExecFileOptions, type StdioOptions } from "child_process";

/** Runtime `execFile` accepts `stdio`; `ExecFileOptions` in @types/node does not list it. */
export type ExecFileAsyncOptions = ExecFileOptions & { stdio?: StdioOptions };

export function execFile(
  file: string,
  args: readonly string[],
  options?: ExecFileAsyncOptions,
): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
  return new Promise((resolve, reject) => {
    execFileCb(file, args, options ?? {}, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: stdout ?? Buffer.alloc(0), stderr: stderr ?? Buffer.alloc(0) });
    });
  });
}
