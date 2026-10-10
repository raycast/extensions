import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type ReadyDeps,
  type Registry,
  ensureVaultReady,
  readRegistry,
  sameNameConflict,
  vaultAt,
  vaultsWithQuickAdd,
} from "./vaults";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "quickadd-vaults-"));
}

function writeJson(path: string, value: unknown) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

describe("readRegistry", () => {
  it("reads the CLI switch and each vault's path and open state", () => {
    const file = join(tempDir(), "obsidian.json");
    writeJson(file, {
      vaults: {
        a: { path: "/Users/me/notes/", ts: 1, open: true },
        b: { path: "/Users/me/work", ts: 2 },
      },
      cli: true,
    });
    expect(readRegistry(file)).toEqual({
      cliEnabled: true,
      vaults: [
        { path: "/Users/me/notes", open: true },
        { path: "/Users/me/work", open: false },
      ],
    });
  });

  it("treats a registry without the cli flag as CLI off", () => {
    const file = join(tempDir(), "obsidian.json");
    writeJson(file, { vaults: {} });
    expect(readRegistry(file).cliEnabled).toBe(false);
  });
});

describe("vaultsWithQuickAdd", () => {
  it("keeps only vaults where QuickAdd is installed and enabled", () => {
    const root = tempDir();
    const vault = (name: string, installed: boolean, enabled: string[]) => {
      const path = join(root, name);
      mkdirSync(join(path, ".obsidian"), { recursive: true });
      if (installed) {
        writeJson(join(path, ".obsidian/plugins/quickadd/manifest.json"), {
          id: "quickadd",
        });
      }
      writeJson(join(path, ".obsidian/community-plugins.json"), enabled);
      return { path, open: false };
    };
    const registry: Registry = {
      cliEnabled: true,
      vaults: [
        vault("ready", true, ["dataview", "quickadd"]),
        vault("disabled", true, ["dataview"]),
        vault("missing", false, ["quickadd"]),
      ],
    };
    expect(vaultsWithQuickAdd(registry)).toEqual([
      { path: join(root, "ready"), name: "ready" },
    ]);
  });
});

describe("sameNameConflict", () => {
  const registry = (...paths: string[]): Registry => ({
    cliEnabled: true,
    vaults: paths.map((path) => ({ path, open: true })),
  });

  it("flags a vault that shares its name with another registered vault", () => {
    expect(
      sameNameConflict(vaultAt("/a/notes"), registry("/a/notes", "/b/notes")),
    ).toBe(true);
  });

  it("allows a vault whose name is unique", () => {
    expect(
      sameNameConflict(vaultAt("/a/notes"), registry("/a/notes", "/b/work")),
    ).toBe(false);
  });
});

describe("ensureVaultReady", () => {
  const vault = vaultAt("/Users/me/e2e-vault");
  const listed = { id: "e2e-text", name: "Capture text", currentNote: "none" };

  function obsidian({
    open,
    cliEnabled = true,
    emptyAnswers = 0,
    failedLists = 0,
  }: {
    open: boolean;
    cliEnabled?: boolean;
    emptyAnswers?: number;
    failedLists?: number;
  }) {
    let clock = 0;
    let polls = 0;
    let lists = 0;
    const opened: string[] = [];
    const deps: ReadyDeps = {
      registry: { cliEnabled, vaults: [{ path: vault.path, open }] },
      open: async (url) => {
        opened.push(url);
      },
      runCli: async ([, command]) => {
        if (command === "vault") {
          polls++;
          return polls > emptyAnswers ? `${vault.path}/\n` : "";
        }
        lists++;
        if (lists <= failedLists) return "";
        return JSON.stringify({ ok: true, choices: [listed] });
      },
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
    };
    return { deps, opened, elapsed: () => clock };
  }

  it("opens nothing when Obsidian already serves the vault", async () => {
    const { deps, opened } = obsidian({ open: true });
    await expect(ensureVaultReady(vault, "e2e-text", deps)).resolves.toEqual({
      ok: true,
      opened: false,
      choices: [listed],
    });
    expect(opened).toEqual([]);
  });

  it("waits for QuickAdd in an open vault that does not list choices yet", async () => {
    const { deps, opened } = obsidian({ open: true, failedLists: 2 });
    await expect(ensureVaultReady(vault, "e2e-text", deps)).resolves.toEqual({
      ok: true,
      opened: true,
      choices: [listed],
    });
    expect(opened).toEqual(["obsidian://open?vault=e2e-vault"]);
  });

  it("opens a closed vault once and waits until QuickAdd answers", async () => {
    const { deps, opened, elapsed } = obsidian({
      open: false,
      emptyAnswers: 3,
    });
    await expect(ensureVaultReady(vault, "e2e-text", deps)).resolves.toEqual({
      ok: true,
      opened: true,
      choices: [listed],
    });
    expect(opened).toEqual(["obsidian://open?vault=e2e-vault"]);
    expect(elapsed()).toBe(2000);
  });

  it("waits for the choice to be listed", async () => {
    const { deps } = obsidian({ open: false });
    await expect(ensureVaultReady(vault, "e2e-missing", deps)).resolves.toEqual(
      {
        ok: false,
        message:
          "Obsidian did not open e2e-vault with QuickAdd ready within 20 seconds.",
      },
    );
  });

  it("gives up after 20 seconds", async () => {
    const { deps, opened, elapsed } = obsidian({
      open: false,
      emptyAnswers: Infinity,
    });
    const result = await ensureVaultReady(vault, undefined, deps);
    expect(result.ok).toBe(false);
    expect(opened).toHaveLength(1);
    expect(elapsed()).toBe(20_000);
  });

  it("refuses a vault that shares its name with another vault", async () => {
    const { deps, opened } = obsidian({ open: false });
    deps.registry.vaults.push({ path: "/elsewhere/e2e-vault", open: true });
    const result = await ensureVaultReady(vault, undefined, deps);
    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("Another vault is also named e2e-vault"),
    });
    expect(opened).toEqual([]);
  });

  it("asks for the CLI to be turned on before touching Obsidian", async () => {
    const { deps, opened } = obsidian({ open: false, cliEnabled: false });
    const result = await ensureVaultReady(vault, undefined, deps);
    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("Command line interface"),
    });
    expect(opened).toEqual([]);
  });
});
