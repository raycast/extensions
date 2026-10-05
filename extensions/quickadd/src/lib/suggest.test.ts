import { describe, expect, it, vi } from "vitest";
import { suggestTags } from "./suggest";
import { vaultAt } from "./vaults";

const cli = vi.hoisted(() => ({ stdout: "" }));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ cliPath: process.execPath }),
}));

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => {
    const callback = args.at(-1) as (error: null, out: object) => void;
    callback(null, { stdout: cli.stdout });
  },
}));

describe("suggestTags", () => {
  const vault = vaultAt("/Users/me/notes");

  it("says which QuickAdd it needs when the CLI lacks quickadd:suggest", async () => {
    cli.stdout =
      'Error: Command "quickadd:suggest" not found. It may require a plugin to be enabled.\n';
    await expect(suggestTags(vault)).rejects.toThrow(
      /^Link and tag completion needs QuickAdd 2\.31 or later\.$/,
    );
  });

  it("passes other CLI errors through unchanged", async () => {
    cli.stdout = "Vault not found.\n";
    await expect(suggestTags(vault)).rejects.toThrow(/^Vault not found\.$/);
  });
});
