import { describe, expect, it, vi } from "vitest";
import { prepareVault } from "./obsidianCli";
import { vaultAt } from "./vaults";

const prefs = vi.hoisted(() => ({ cliPath: "/nonexistent/obsidian" }));

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => prefs }));

vi.mock("node:child_process", () => ({
  execFile: (file: string, ...rest: unknown[]) => {
    const callback = rest.at(-1) as (error: Error | null, out?: object) => void;
    if (file === "open")
      callback(new Error("No application knows how to open the URL"));
    else callback(null, { stdout: "" });
  },
}));

describe("prepareVault", () => {
  const vault = vaultAt("/Users/me/notes");

  it("reports a CLI path preference that points nowhere instead of throwing", async () => {
    prefs.cliPath = "/nonexistent/obsidian";
    await expect(
      prepareVault(vault, undefined, {
        cliEnabled: true,
        vaults: [{ path: vault.path, open: true }],
      }),
    ).resolves.toEqual({
      ok: false,
      message: expect.stringContaining("Obsidian CLI not found"),
    });
  });

  it("reports a vault that macOS cannot open instead of throwing", async () => {
    prefs.cliPath = process.execPath;
    await expect(
      prepareVault(vault, undefined, {
        cliEnabled: true,
        vaults: [{ path: vault.path, open: false }],
      }),
    ).resolves.toEqual({
      ok: false,
      message: "No application knows how to open the URL",
    });
  });
});
