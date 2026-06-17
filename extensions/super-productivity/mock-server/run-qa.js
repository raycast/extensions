#!/usr/bin/env node
/**
 * Cross-platform QA runner.
 *
 * Resolution order:
 *   1. SP_API_URL env var (test a specific endpoint)
 *   2. The running Super Productivity desktop app at http://127.0.0.1:3876
 *      (probed; if /health responds we run the exercise against it)
 *   3. If neither exists, print a helpful message and exit non-zero.
 *
 * The mock server was removed to keep the testing surface focused on real
 * Super Productivity instances only. See CONTRIBUTING.md for details.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP_PORT = 3876;
const SP_DEFAULT = `http://127.0.0.1:${SP_PORT}`;
const PROBE_MS = 2_000;
const PROBE_POLL_MS = 100;
const SHUTDOWN_GRACE_MS = 2_000;

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";
const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

function tag(text) {
  return useColor
    ? `${CYAN}[qa-runner]${RESET} ${text}`
    : `[qa-runner] ${text}`;
}
function dim(text) {
  return useColor ? `${DIM}${text}${RESET}` : text;
}

async function probe(url, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.ok === true) return true;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, PROBE_POLL_MS));
  }
  return false;
}

// Module-scope handle so the signal handler can reach the exercise child.
let exerciseChild = null;

async function main() {
  // Pick the target URL.
  const target = process.env.SP_API_URL || SP_DEFAULT;
  console.log(tag(`target: ${target}`));

  if (!process.env.SP_API_URL) {
    console.log(tag(`probing ${SP_DEFAULT}/health …`));
    const up = await probe(SP_DEFAULT + "/health", PROBE_MS);
    if (!up) {
      console.error(
        tag(
          `${RED}Super Productivity is not reachable at ${SP_DEFAULT}${RESET}`,
        ),
      );
      console.error(
        tag(`Make sure SP is running with the Local REST API enabled.`),
      );
      console.error(
        tag(
          `Or set SP_API_URL to point at your SP instance (e.g. SP_API_URL=http://192.168.1.50:3876).`,
        ),
      );
      process.exit(1);
    }
    console.log(tag(`${GREEN}SP reachable${RESET}`));
  }
  console.log(dim(""));

  // Run the exercise against the target.
  exerciseChild = spawn(process.execPath, [path.join(HERE, "qa-exercise.js")], {
    stdio: "inherit",
    cwd: HERE,
    env: { ...process.env, SP_API_URL: target },
  });
  const exitCode = await new Promise((resolve) => {
    exerciseChild.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
    exerciseChild.on("error", () => resolve(1));
  });

  if (exitCode === 0) {
    console.log(dim(""));
    console.log(tag(`${GREEN}qa finished successfully${RESET}`));
  } else {
    console.error(dim(""));
    console.error(tag(`${RED}qa exited with code ${exitCode}${RESET}`));
  }

  process.exit(exitCode);
}

// ─── Signal handling ────────────────────────────────────
// Forward SIGINT/SIGTERM to the exercise child so it can stop cleanly.
let cleaningUp = false;
async function handleSignal(signal) {
  if (cleaningUp) {
    process.exit(130);
  }
  cleaningUp = true;
  console.error(dim(`\n${tag(`received ${signal}, tearing down…`)}`));
  if (exerciseChild && exerciseChild.exitCode === null) {
    try {
      exerciseChild.kill(signal);
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(130), SHUTDOWN_GRACE_MS + 500).unref();
}
process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

main().catch(async (e) => {
  console.error(tag(`${RED}runner crashed: ${e?.message ?? e}${RESET}`));
  process.exit(1);
});
