import { execFile } from "node:child_process";
export async function nativeCall<T>(
  binary: string,
  command: string,
  request?: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      [command],
      { timeout: 15000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        try {
          const parsed = JSON.parse(stdout);
          if (error || parsed.error)
            reject(new Error(parsed.error || stderr || error?.message));
          else resolve(parsed as T);
        } catch {
          reject(
            new Error(
              stderr ||
                error?.message ||
                "Invalid response from the resource collector",
            ),
          );
        }
      },
    );
    child.stdin?.end(
      request === undefined ? undefined : JSON.stringify(request),
    );
  });
}
