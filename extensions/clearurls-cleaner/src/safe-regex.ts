import { Worker } from "worker_threads";

const MAX_URL_LENGTH = 8192;
const REGEX_TIMEOUT_MS = 1000;

const workerCode = `
  const { parentPort } = require("worker_threads");
  parentPort.on("message", (task) => {
    try {
      const regex = new RegExp(task.pattern, task.flags);
      let result;
      switch (task.type) {
        case "test": result = regex.test(task.input); break;
        case "exec": result = regex.exec(task.input); break;
        case "replace": result = task.replacement ? task.input.replace(regex, task.replacement) : task.input; break;
      }
      parentPort.postMessage({ success: true, result });
    } catch (error) {
      parentPort.postMessage({ success: false, error: String(error) });
    }
  });
`;

function checkComplexity(pattern: string): boolean {
  const nestedQuantifier = /\([^()]*[*+?][^()]*\)[*+?]/;
  const quantifiedAlternation = /\([^()]*\|[^()]*\)[*+?]/;
  return (
    !nestedQuantifier.test(pattern) && !quantifiedAlternation.test(pattern)
  );
}

async function runWorker<T>(task: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerCode, { eval: true });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Regex execution timed out"));
    }, REGEX_TIMEOUT_MS);

    worker.on(
      "message",
      (message: { success: boolean; result?: unknown; error?: string }) => {
        clearTimeout(timer);
        worker.terminate();
        if (message.success) {
          resolve(message.result as T);
        } else {
          reject(new Error(message.error || "Regex worker error"));
        }
      },
    );

    worker.on("error", (error) => {
      clearTimeout(timer);
      worker.terminate();
      reject(error);
    });

    worker.postMessage(task);
  });
}

export async function safeTest(
  pattern: string,
  flags: string,
  input: string,
): Promise<boolean> {
  if (input.length > MAX_URL_LENGTH) return false;
  if (!checkComplexity(pattern)) return false;
  return runWorker<boolean>({ type: "test", pattern, flags, input });
}

export async function safeExec(
  pattern: string,
  flags: string,
  input: string,
): Promise<RegExpExecArray | null> {
  if (input.length > MAX_URL_LENGTH) return null;
  if (!checkComplexity(pattern)) return null;
  return runWorker<RegExpExecArray | null>({
    type: "exec",
    pattern,
    flags,
    input,
  });
}
