import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  return Promise.race([
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        return result;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        throw error;
      }),
    timeoutPromise,
  ]);
}

export default async function launchRuntime(): Promise<boolean> {
  const timeout = 3000;

  try {
    await withTimeout(execAsync('open "pieces://launch"'), timeout);
    return true;
  } catch (deeplinkError) {
    return false;
  }
}
