import { describe, expect, it } from "vitest";
import { createAmpInvocation } from "./ampClient";

describe("createAmpInvocation", () => {
  it("runs the installed @ccusage/amp package with the current Node executable", () => {
    const invocation = createAmpInvocation();

    expect(invocation.file).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(
      /assets\/\.generated\/ccusage-cli\/@ccusage\/amp\/dist\/index\.js$/,
    );
    expect(invocation.args.slice(1)).toEqual(["daily", "--json"]);
    expect(invocation.commandText).toBe("@ccusage/amp daily --json");
  });
});
