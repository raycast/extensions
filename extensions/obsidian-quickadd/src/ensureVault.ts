import { CliFailure, CliResult, CliTextResult, normalizePath, runCli, runCliText } from "./cli";
import { openUri } from "./open";
import { buildOpenUri } from "./uri";

export interface VaultDeps {
  open(): Promise<void>;
  /** Which vault answers commands sent to this vault's name: `obsidian-cli vault=<name> vault info=path`. */
  whoAnswers(): Promise<CliTextResult>;
  list(): Promise<CliResult>;
  sleep(ms: number): Promise<void>;
  now(): number;
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
 * Make sure a run reaches this vault and no other. A `vault=` command for a vault that isn't open (or is still
 * loading) can be answered by another window, and vaults with copied QuickAdd settings share choice ids — so
 * the vault must first answer as itself (by path); only then is its QuickAdd asked for the choice.
 */
export async function ensureVaultReady(
  choiceId: string,
  vaultPath: string,
  deps: VaultDeps,
  timeoutMs = 20000,
): Promise<VaultReady> {
  const self = normalizePath(vaultPath);
  let opened = false;
  const openOnce = async () => {
    if (opened) return;
    await deps.open();
    opened = true;
  };
  const deadline = deps.now() + timeoutMs;
  let lastFailure: { reason: CliFailure; message: string } | undefined;

  for (;;) {
    const who = await deps.whoAnswers();
    if (who.kind === "failure" && who.reason === "cli-disabled") {
      return { ok: false, reason: who.reason, message: who.message };
    }
    if (who.kind === "text" && normalizePath(who.text.trim()) === self) {
      const result = await deps.list();
      if (result.kind === "json") {
        lastFailure = undefined;
        if (choiceIds(result.data).includes(choiceId)) return { ok: true, opened };
        if (!opened) {
          return {
            ok: false,
            reason: "choice-missing",
            message:
              "QuickAdd in this vault doesn't have this choice. Reload QuickAdd or restart Obsidian and try again.",
          };
        }
      } else if (!opened) {
        // The vault was already open, so QuickAdd's answer is final (e.g. not installed or too old).
        return { ok: false, reason: result.reason, message: result.message };
      } else {
        // Just opened: plugins may still be loading.
        lastFailure = { reason: result.reason, message: result.message };
      }
    } else {
      // Not answering as itself: closed, still loading, a stale "open" flag, or Obsidian not running.
      await openOnce();
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

export function realVaultDeps(cli: string, vaultName: string): VaultDeps {
  return {
    open: () => openUri(buildOpenUri(vaultName), true),
    whoAnswers: () => runCliText(cli, vaultName, "vault", ["info=path"]),
    list: () => runCli(cli, vaultName, "quickadd:list"),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
}
