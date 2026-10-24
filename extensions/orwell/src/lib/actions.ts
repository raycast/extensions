import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DevServer, RegistryEntry } from "./types";

const SAFE_CMD_PATTERN = /^(npm|yarn|pnpm|bun) run \w[\w-]*$/;

export async function stopServer(server: DevServer): Promise<void> {
  try {
    process.kill(server.pid, "SIGTERM");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ESRCH") throw err;
  }
}

export async function restartServer(server: DevServer): Promise<void> {
  try {
    process.kill(server.pid, "SIGTERM");
  } catch {
    // already gone
  }

  await new Promise((r) => setTimeout(r, 1500));

  const resolved = await resolveStartCommand(server.projectDir, server.command);
  const restartCmd = SAFE_CMD_PATTERN.test(resolved) ? resolved : "npm run dev";

  const child = spawn("sh", ["-c", restartCmd], {
    cwd: server.projectDir,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  child.unref();
}

export async function startServer(entry: RegistryEntry): Promise<void> {
  const cmd = SAFE_CMD_PATTERN.test(entry.startCommand) ? entry.startCommand : "npm run dev";

  const child = spawn("sh", ["-c", cmd], {
    cwd: entry.projectDir,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  child.unref();
}

/**
 * Resolve the best start command for a project.
 * 1. Match the running process command against package.json scripts
 * 2. Fall back to dev > start > serve scripts
 * 3. Last resort: the raw command from ps
 */
export async function resolveStartCommand(projectDir: string, processCommand?: string): Promise<string> {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return processCommand || "npm run dev";

  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const scripts: Record<string, string> = pkg.scripts ?? {};

    // Try to match the running command against a script value
    if (processCommand) {
      for (const [name, cmd] of Object.entries(scripts)) {
        // The ps command looks like: node /path/to/vite dev --port 5173
        // The script value looks like: vite dev --port 5173
        // Check if the ps command ends with or contains the script command
        if (processCommand.includes(cmd) || cmd.split("&&").some((part) => processCommand.includes(part.trim()))) {
          return `npm run ${name}`;
        }
      }
    }

    // Fall back to well-known script names
    if (scripts.dev) return "npm run dev";
    if (scripts.start) return "npm run start";
    if (scripts.serve) return "npm run serve";
  } catch {
    // fall through
  }

  return processCommand || "npm run dev";
}
