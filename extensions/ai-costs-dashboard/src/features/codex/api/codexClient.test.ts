import { describe, expect, it } from "vitest";
import { createCodexInvocation } from "./codexClient";

describe("createCodexInvocation", () => {
  it("runs the installed @ccusage/codex package with the current Node executable", () => {
    const invocation = createCodexInvocation();

    expect(invocation.file).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(
      /assets\/\.generated\/ccusage-cli\/@ccusage\/codex\/dist\/index\.js$/,
    );
    expect(invocation.args.slice(1)).toEqual(["daily", "--json"]);
    expect(invocation.commandText).toBe("@ccusage/codex daily --json");
  });
});
