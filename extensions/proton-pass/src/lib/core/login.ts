import { spawn } from "node:child_process";
import { CommandDescriptor, normalizeCliExecutionError } from "./exec";
import { PassCliError } from "../types";

const LOGIN_HOST = "account.proton.me";

export interface BrowserLoginOptions {
  openUrl: (url: string) => void | Promise<void>;
  timeoutMs: number;
}

export function extractLoginUrl(text: string): string | null {
  for (const candidate of text.match(/https?:\/\/\S+/g) ?? []) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && url.host === LOGIN_HOST) return candidate;
    } catch {
      // Keep scanning output. Browser opening is best-effort.
    }
  }

  return null;
}

function normalizeLoginError(error: unknown, cliPath: string): PassCliError {
  const normalized = normalizeCliExecutionError(error, cliPath);
  return normalized.type === "unknown" ? new PassCliError("pass-cli login failed.", "unknown") : normalized;
}

export function runBrowserLogin(command: CommandDescriptor, options: BrowserLoginOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.file, [...command.args, "login"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let opened = false;
    let settled = false;
    let openPromise: Promise<void> | undefined;

    const finish = (error?: PassCliError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };

    const scanCompleteLines = (flush = false) => {
      const boundary = flush ? stdout.length : stdout.lastIndexOf("\n") + 1;
      if (boundary === 0) return;
      const complete = stdout.slice(0, boundary);
      stdout = stdout.slice(boundary);
      const url = opened ? null : extractLoginUrl(complete);
      if (!url) return;
      opened = true;
      openPromise = Promise.resolve(options.openUrl(url)).then(
        () => undefined,
        () => {
          child.kill();
          finish(new PassCliError("Could not open Proton login URL.", "unknown"));
        },
      );
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      scanCompleteLines();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(normalizeLoginError(error, command.file)));
    child.on("close", (code) => {
      scanCompleteLines(true);
      if (settled) return;
      if (code !== 0) {
        const error = Object.assign(new Error(`pass-cli exited with code ${code ?? "unknown"}`), { stderr });
        finish(normalizeLoginError(error, command.file));
        return;
      }
      void (openPromise ?? Promise.resolve()).then(() => finish());
    });

    const timer = setTimeout(() => {
      child.kill();
      finish(new PassCliError("Login timed out. Complete browser authentication and try again.", "timeout"));
    }, options.timeoutMs);
  });
}
