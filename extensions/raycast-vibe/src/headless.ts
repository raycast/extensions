import { execFile } from "node:child_process";
import { Agent, parseEnvLines, splitArgs } from "./agents";

export type HeadlessResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
};

const HEADLESS_TIMEOUT_MS = 120_000;

export function runHeadless(
  agent: Agent,
  prompt: string,
  cwd: string,
): Promise<HeadlessResult> {
  return new Promise((resolve) => {
    if (!agent.headlessArgsTemplate) {
      resolve({
        ok: false,
        stdout: "",
        stderr: `Agent ${agent.name} is not headless-capable.`,
        timedOut: false,
        exitCode: null,
      });
      return;
    }
    const argv = splitArgs(agent.headlessArgsTemplate).map((token) =>
      token.replace("{{prompt}}", prompt),
    );
    const child = execFile(
      agent.command,
      argv,
      {
        cwd,
        env: { ...process.env, ...parseEnvLines(agent.env) },
        timeout: HEADLESS_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const timedOut =
          error !== null &&
          typeof error === "object" &&
          "killed" in error &&
          Boolean((error as { killed?: boolean }).killed) &&
          "signal" in error &&
          (error as { signal?: string }).signal === "SIGTERM";
        const out = typeof stdout === "string" ? stdout.trim() : "";
        const err = typeof stderr === "string" ? stderr.trim() : "";
        const code =
          error && typeof error === "object" && "exitCode" in error
            ? ((error as { exitCode?: number | null }).exitCode ?? null)
            : 0;
        resolve({
          ok: !error && out.length > 0,
          stdout: out,
          stderr: err,
          timedOut,
          exitCode: code,
        });
      },
    );
    void child;
  });
}
