import { exec } from "child_process";
import { promisify } from "util";
import { handleGitError } from "../error-utils";

const execAsync = promisify(exec);

const gitQueue: (() => Promise<void>)[] = [];
let isProcessing = false;

async function processGitQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (gitQueue.length > 0) {
    const task = gitQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error("Error in Git operation:", error);
      }
    }
  }

  isProcessing = false;
}

export function queueGitOperation<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    gitQueue.push(async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processGitQueue();
  });
}

export async function runGitCommand(command: string, cwd: string): Promise<string> {
  return queueGitOperation(async () => {
    try {
      const { stdout } = await execAsync(command, { cwd });
      return stdout.trim();
    } catch (error) {
      throw handleGitError(error as Error);
    }
  });
}
