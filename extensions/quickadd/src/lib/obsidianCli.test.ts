import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareVault, runChoice } from "./obsidianCli";
import { vaultAt } from "./vaults";

const prefs = vi.hoisted(() => ({ cliPath: "/nonexistent/obsidian" }));
const cli = vi.hoisted(() => ({ stdout: "", args: [] as string[] }));

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => prefs }));

vi.mock("node:child_process", () => ({
  execFile: (file: string, ...rest: unknown[]) => {
    const callback = rest.at(-1) as (error: Error | null, out?: object) => void;
    if (file === "open")
      callback(new Error("No application knows how to open the URL"));
    else {
      cli.args = rest[0] as string[];
      callback(null, { stdout: cli.stdout });
    }
  },
}));

beforeEach(() => {
  cli.stdout = "";
  cli.args = [];
});

describe("runChoice", () => {
  const vault = vaultAt("/Users/me/notes");

  it("names the current note only when the caller picked one", async () => {
    prefs.cliPath = process.execPath;
    cli.stdout = '{"ok":true}';
    await runChoice(vault, "inbox", { current: "none" });
    expect(cli.args).toContain("current=none");
    await runChoice(vault, "inbox");
    expect(cli.args.some((arg) => arg.startsWith("current"))).toBe(false);
  });
});

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
