import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { classifyCliOutput, classifyCliText, findCli, readRegistry, runCli, runCliText } from "../src/cli";
import { fakeCli, sq } from "./helpers/fakeCli";

describe("classifyCliOutput", () => {
  it("parses QuickAdd JSON", () => {
    expect(classifyCliOutput('\n{"command":"quickadd:list","ok":true,"count":0,"choices":[]}\n')).toEqual({
      kind: "json",
      data: { command: "quickadd:list", ok: true, count: 0, choices: [] },
    });
  });

  it.each([
    ["Command line interface is not enabled. Please turn it on in Settings > General > Advanced.", "cli-disabled"],
    ["The CLI is unable to find Obsidian. Please make sure Obsidian is running and try again.", "not-running"],
    ['Error: Command "quickadd:interactive" not found. It may require a plugin to be enabled.', "quickadd-old"],
    ["Vault not found.", "vault-not-found"],
    ["something else entirely", "unknown"],
    ["{broken json", "unknown"],
  ])("classifies %j as %s", (stdout, reason) => {
    expect(classifyCliOutput(stdout)).toEqual({ kind: "failure", reason, message: stdout.trim() });
  });
});

describe("list-shaped JSON and plain text", () => {
  it("wraps a JSON array as { items }", () => {
    expect(classifyCliOutput('[{"tag":"#a","count":"1"}]')).toEqual({
      kind: "json",
      data: { items: [{ tag: "#a", count: "1" }] },
    });
  });

  it("returns plain text unless it is a known failure", () => {
    expect(classifyCliText("A.md\nB.md\n")).toEqual({ kind: "text", text: "A.md\nB.md\n" });
    expect(classifyCliText("")).toEqual({ kind: "text", text: "" });
    expect(classifyCliText("Command line interface is not enabled.")).toMatchObject({ reason: "cli-disabled" });
    expect(classifyCliText('Error: Command "files" not found.')).toMatchObject({ kind: "failure", reason: "unknown" });
  });

  it("runs a text command", async () => {
    const cli = fakeCli(`printf 'A.md\\nB.md\\n'`);
    expect(await runCliText(cli, "v", "files")).toEqual({ kind: "text", text: "A.md\nB.md\n" });
  });
});

describe("findCli", () => {
  it("prefers the configured path when it exists", () => {
    const cli = fakeCli("true");
    expect(findCli(cli, [])).toBe(cli);
    expect(findCli("/nonexistent/obsidian-cli", [cli])).toBeUndefined();
  });

  it("falls back to the first existing candidate", () => {
    const cli = fakeCli("true");
    expect(findCli(undefined, ["/nonexistent/a", cli])).toBe(cli);
    expect(findCli(undefined, ["/nonexistent/a"])).toBeUndefined();
  });
});

describe("readRegistry", () => {
  it("reads the cli flag and open vaults", () => {
    const path = join(mkdtempSync(join(tmpdir(), "qa-reg-")), "obsidian.json");
    writeFileSync(
      path,
      JSON.stringify({ cli: true, vaults: { a: { path: "/v/one/", open: true }, b: { path: "/v/two" } } }),
    );
    expect(readRegistry(path)).toEqual({ cli: true, openVaults: ["/v/one"] });
  });

  it("defaults to CLI off and nothing open", () => {
    expect(readRegistry("/nonexistent/obsidian.json")).toEqual({ cli: false, openVaults: [] });
  });
});

describe("runCli", () => {
  it("passes vault= first, then the command and its args", async () => {
    const cli = fakeCli(`printf '{"args":"%s"}' "$*"`);
    expect(await runCli(cli, "my-vault", "quickadd:check", ["choice=A B"])).toEqual({
      kind: "json",
      data: { args: "vault=my-vault quickadd:check choice=A B" },
    });
  });

  it("classifies failure text printed with exit code 0", async () => {
    const cli = fakeCli(`printf '%s' ${sq("Command line interface is not enabled.")}`);
    expect(await runCli(cli, "v", "quickadd:list")).toMatchObject({ kind: "failure", reason: "cli-disabled" });
  });

  it("reports a crashing or missing binary as unknown", async () => {
    expect(await runCli(fakeCli("exit 3"), "v", "quickadd:list")).toMatchObject({ kind: "failure", reason: "unknown" });
    expect(await runCli("/nonexistent/obsidian-cli", "v", "quickadd:list")).toMatchObject({
      kind: "failure",
      reason: "unknown",
    });
  });
});
