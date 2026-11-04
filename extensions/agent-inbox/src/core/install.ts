import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { CLI_PATH } from "./paths";
import { run } from "./exec";
import { InstallPlan } from "./adapters/types";

/**
 * Find a node binary the hooks can use. A login shell sees the user's PATH (nvm, Homebrew…);
 * Raycast's own runtime is the last resort.
 */
export async function resolveNode(fallback = process.execPath): Promise<string | undefined> {
  const shell = process.env.SHELL && existsSync(process.env.SHELL) ? process.env.SHELL : "/bin/zsh";
  const r = await run(shell, ["-lc", "command -v node"], undefined, 4000);
  const fromShell = r.stdout.trim().split("\n").pop();
  if (r.ok && fromShell && fromShell.startsWith("/") && existsSync(fromShell)) return fromShell;
  for (const p of ["/opt/homebrew/bin/node", "/usr/local/bin/node"]) if (existsSync(p)) return p;
  return fallback && existsSync(fallback) ? fallback : undefined;
}

/** Copy the bundled CLI to ~/.sessions/bin so hook paths stay stable across extension updates. */
export function installCli(source: string, target = CLI_PATH): string {
  mkdirSync(dirname(target), { recursive: true });
  const same = existsSync(target) && readFileSync(target, "utf8") === readFileSync(source, "utf8");
  if (!same) {
    const temporary = `${target}.${process.pid}.tmp`;
    try {
      copyFileSync(source, temporary);
      chmodSync(temporary, 0o755);
      renameSync(temporary, target);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
  chmodSync(target, 0o755);
  return target;
}

export function applyPlan(plan: InstallPlan): string[] {
  const written: string[] = [];
  for (const c of plan.changes) {
    if (c.before === c.after) continue;
    mkdirSync(dirname(c.path), { recursive: true });
    if (c.before) writeFileSync(c.path + ".agent-inbox.bak", c.before);
    writeFileSync(c.path, c.after);
    written.push(c.path);
  }
  return written;
}

export function terminalNotifierPath(): string | undefined {
  for (const p of ["/opt/homebrew/bin/terminal-notifier", "/usr/local/bin/terminal-notifier"]) if (existsSync(p)) return p;
  return undefined;
}
