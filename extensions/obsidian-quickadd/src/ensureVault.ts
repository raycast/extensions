import { readFileSync } from "fs";
import { join } from "path";
import { CliFailure, CliResult, normalizePath, readRegistry, runCli } from "./cli";
import { QUICKADD_DATA } from "./config";
import { openUri } from "./open";
import { buildOpenUri } from "./uri";

export interface VaultDeps {
  isOpen(): boolean;
  open(): Promise<void>;
  list(): Promise<CliResult>;
  sleep(ms: number): Promise<void>;
  now(): number;
  /** Choice ids in the vault's own QuickAdd settings on disk. */
  expectedIds(): string[];
}

export type VaultReady =
  /** `opened`: the vault had to be opened (or Obsidian launched), which moves focus to Obsidian. */
  { ok: true; opened: boolean } | { ok: false; reason: CliFailure | "timeout" | "choice-missing"; message: string };

export function choiceIds(data: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const walk = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value as { id?: unknown; choices?: unknown }[]) {
      if (typeof item?.id === "string") ids.push(item.id);
      walk(item?.choices);
    }
  };
  walk(data.choices);
  return ids;
}

/**
 * A `vault=` command for a vault that isn't open makes Obsidian open it, and a command sent while it
 * loads can run in another window. For a vault we had to open, only report ready once QuickAdd lists
 * exactly that vault's own choices; failures while it loads (plugins not registered yet) mean "wait".
 */
export async function ensureVaultReady(choiceId: string, deps: VaultDeps, timeoutMs = 20000): Promise<VaultReady> {
  let opened = false;
  if (!deps.isOpen()) {
    await deps.open();
    opened = true;
  }
  const deadline = deps.now() + timeoutMs;
  let lastFailure: { reason: CliFailure; message: string } | undefined;
  for (;;) {
    const result = await deps.list();
    if (result.kind === "json") {
      lastFailure = undefined;
      const ids = choiceIds(result.data);
      if (ids.includes(choiceId) && (!opened || sameIds(ids, deps.expectedIds()))) return { ok: true, opened };
      if (!opened) {
        return {
          ok: false,
          reason: "choice-missing",
          message:
            "QuickAdd in this vault doesn't have this choice. Reload QuickAdd or restart Obsidian and try again.",
        };
      }
    } else if (result.reason === "not-running") {
      if (!opened) {
        await deps.open();
        opened = true;
      }
    } else if (!opened) {
      return { ok: false, reason: result.reason, message: result.message };
    } else {
      lastFailure = { reason: result.reason, message: result.message };
    }
    if (deps.now() >= deadline) {
      if (lastFailure) return { ok: false, ...lastFailure };
      return {
        ok: false,
        reason: "timeout",
        message: "The vault didn't answer in time. Is it open in Obsidian with QuickAdd enabled?",
      };
    }
    await deps.sleep(500);
  }
}

function sameIds(a: string[], b: string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}

function idsOnDisk(vaultPath: string): string[] {
  try {
    return choiceIds(JSON.parse(readFileSync(join(vaultPath, QUICKADD_DATA), "utf8")));
  } catch {
    return [];
  }
}

export function realVaultDeps(cli: string, vaultName: string, vaultPath: string): VaultDeps {
  return {
    isOpen: () => readRegistry().openVaults.includes(normalizePath(vaultPath)),
    open: () => openUri(buildOpenUri(vaultName), true),
    list: () => runCli(cli, vaultName, "quickadd:list"),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    expectedIds: () => idsOnDisk(vaultPath),
  };
}
