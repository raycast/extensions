import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { ChoiceSummary, ListResponse } from "./types";

/** `name` is what the CLI's `vault=` and `obsidian://` URIs address the vault by. */
export interface Vault {
  path: string;
  name: string;
}

export interface Registry {
  cliEnabled: boolean;
  vaults: { path: string; open: boolean }[];
}

export function vaultAt(path: string): Vault {
  const trimmed = path.replace(/\/+$/, "");
  return { path: trimmed, name: basename(trimmed) };
}

export function readRegistry(
  file = join(homedir(), "Library/Application Support/obsidian/obsidian.json"),
): Registry {
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    cli?: boolean;
    vaults?: Record<string, { path: string; open?: boolean }>;
  };
  return {
    cliEnabled: raw.cli === true,
    vaults: Object.values(raw.vaults ?? {}).map(({ path, open }) => ({
      path: vaultAt(path).path,
      open: open === true,
    })),
  };
}

function hasQuickAdd(vaultPath: string): boolean {
  const config = join(vaultPath, ".obsidian");
  if (!existsSync(join(config, "plugins/quickadd/manifest.json"))) return false;
  try {
    const enabled: unknown = JSON.parse(
      readFileSync(join(config, "community-plugins.json"), "utf8"),
    );
    return Array.isArray(enabled) && enabled.includes("quickadd");
  } catch {
    return false;
  }
}

export function vaultsWithQuickAdd(registry: Registry): Vault[] {
  return registry.vaults
    .filter(({ path }) => hasQuickAdd(path))
    .map(({ path }) => vaultAt(path));
}

export function sameNameConflict(vault: Vault, registry: Registry): boolean {
  return registry.vaults.some(
    ({ path }) => path !== vault.path && basename(path) === vault.name,
  );
}

export function chooseVault(
  preferredPath: string | undefined,
  registry: Registry,
): { kind: "vault"; vault: Vault } | { kind: "pick"; vaults: Vault[] } {
  if (preferredPath) return { kind: "vault", vault: vaultAt(preferredPath) };
  const vaults = vaultsWithQuickAdd(registry);
  return vaults.length === 1
    ? { kind: "vault", vault: vaults[0] }
    : { kind: "pick", vaults };
}

export interface ReadyDeps {
  registry: Registry;
  open: (url: string) => Promise<void>;
  /** The CLI's stdout, or "" when it fails (Obsidian still starting). */
  runCli: (args: string[]) => Promise<string>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export type Readiness =
  | { ok: true; opened: boolean; choices: ChoiceSummary[] }
  | { ok: false; message: string };

const POLL_MS = 500;
const OPEN_TIMEOUT_MS = 20_000;

export async function ensureVaultReady(
  vault: Vault,
  choiceId: string | undefined,
  deps: ReadyDeps,
): Promise<Readiness> {
  if (!deps.registry.cliEnabled) {
    return {
      ok: false,
      message:
        "Turn on Obsidian's command line interface (Settings → General → Command line interface), then restart Obsidian.",
    };
  }
  if (sameNameConflict(vault, deps.registry)) {
    return {
      ok: false,
      message: `Another vault is also named ${vault.name}, and Obsidian addresses vaults by name. Rename one of the vault folders.`,
    };
  }
  const entry = deps.registry.vaults.find(({ path }) => path === vault.path);
  if (!entry) {
    return {
      ok: false,
      message: `Obsidian does not know ${vault.path}. Open it once with Open folder as vault.`,
    };
  }

  const servesVault = async () =>
    vaultAt(
      (await deps.runCli([`vault=${vault.name}`, "vault", "info=path"])).trim(),
    ).path === vault.path;
  const listedChoices = async () => {
    try {
      const { ok, choices = [] } = JSON.parse(
        await deps.runCli([`vault=${vault.name}`, "quickadd:list"]),
      ) as ListResponse;
      const listed = !choiceId || choices.some(({ id }) => id === choiceId);
      return ok === true && listed ? choices : undefined;
    } catch {
      return undefined;
    }
  };

  const choices =
    entry.open && (await servesVault()) && (await listedChoices());
  if (choices) return { ok: true, opened: false, choices };

  await deps.open(`obsidian://open?vault=${encodeURIComponent(vault.name)}`);
  const deadline = deps.now() + OPEN_TIMEOUT_MS;
  while (deps.now() < deadline) {
    await deps.sleep(POLL_MS);
    const choices = (await servesVault()) && (await listedChoices());
    if (choices) return { ok: true, opened: true, choices };
  }
  return {
    ok: false,
    message: `Obsidian did not open ${vault.name} with QuickAdd ready within 20 seconds.`,
  };
}
