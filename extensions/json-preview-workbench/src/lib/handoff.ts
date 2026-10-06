import { spawn } from "node:child_process";
import { access, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

export async function clearStaleHandoffs(directory: string, maxAgeMs = 60_000): Promise<void> {
  const now = Date.now();
  for (const name of await readdir(directory)) {
    if (!/^input-[0-9a-f-]{36}\.json$/.test(name)) continue;
    const file = join(directory, name);
    const info = await stat(file).catch(() => undefined);
    if (info?.isFile() && now - info.mtimeMs > maxAgeMs) await unlink(file).catch(() => undefined);
  }
}

export async function runWithHandoff(
  executable: string,
  args: string[],
  request: string,
  timeoutMs = 5000,
): Promise<void> {
  const child = spawn(executable, args, { detached: true, stdio: "ignore" });
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let checking = false;
      let exited: string | undefined;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(timeout);
        child.off("error", onError);
        child.off("exit", onExit);
        if (error) reject(error);
        else resolve();
      };
      const check = async () => {
        if (settled || checking) return;
        checking = true;
        try {
          await access(request);
          if (exited) finish(new Error(`The editor exited before reading its input (${exited}).`));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") finish();
          else finish(error instanceof Error ? error : new Error(String(error)));
        } finally {
          checking = false;
        }
      };
      const onError = (error: Error) => finish(error);
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        exited = signal ?? String(code);
        void check();
      };
      const poll = setInterval(() => void check(), 25);
      const timeout = setTimeout(
        () => finish(new Error("The editor did not read its input within 5 seconds.")),
        timeoutMs,
      );
      child.once("error", onError);
      child.once("exit", onExit);
      void check();
    });
    child.unref();
  } catch (error) {
    child.kill();
    throw error;
  } finally {
    await unlink(request).catch(() => undefined);
  }
}
