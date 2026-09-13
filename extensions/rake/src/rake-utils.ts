import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export type RakeTask = {
  name: string;
  args: string[];
  description: string;
};

export function parseRakeTaskLine(line: string): RakeTask | null {
  const match = line.match(/^rake\s+(.+?)(?:\[([^\]]*)\])?(?:\s+#\s*(.*))?$/);
  if (!match) return null;

  return {
    name: match[1].trimEnd(),
    args: match[2] ? match[2].split(",").map((arg) => arg.trim()) : [],
    description: match[3] ?? "",
  };
}

const OUTPUT_LIMIT = 16_384;

type ProcessOptions = {
  cwd: string;
  onStdoutLine?: (line: string) => void;
};

export function runProcess(command: string, args: string[], options: ProcessOptions) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutTruncated ||= stdout.length + chunk.length > OUTPUT_LIMIT;
      stdout = (stdout + chunk).slice(-OUTPUT_LIMIT);
    });
    child.stderr.on("data", (chunk: string) => {
      stderrTruncated ||= stderr.length + chunk.length > OUTPUT_LIMIT;
      stderr = (stderr + chunk).slice(-OUTPUT_LIMIT);
    });

    // Task discovery consumes every line, independently of the bounded toast output.
    const lines = options.onStdoutLine ? createInterface({ input: child.stdout, crlfDelay: Infinity }) : undefined;
    if (options.onStdoutLine) lines?.on("line", options.onStdoutLine);

    child.once("error", reject);
    child.once("close", (code, signal) => {
      lines?.close();
      const output = {
        stdout: (stdoutTruncated ? "[Earlier output omitted]\n" : "") + stdout,
        stderr: (stderrTruncated ? "[Earlier output omitted]\n" : "") + stderr,
      };
      if (code === 0) {
        resolve(output);
      } else {
        const status = signal ? `terminated by ${signal}` : `exited with code ${code}`;
        const detail = output.stderr.trim() || output.stdout.trim();
        reject(new Error(`${command} ${status}${detail ? `\n${detail}` : ""}`));
      }
    });
  });
}
