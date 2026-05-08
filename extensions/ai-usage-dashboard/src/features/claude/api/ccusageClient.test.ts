import { describe, expect, it } from "vitest";
import {
  createCcusageInvocation,
  normalizeCommandError,
} from "./ccusageClient";

describe("createCcusageInvocation", () => {
  it("runs the installed ccusage package with the current Node executable", () => {
    const invocation = createCcusageInvocation();

    expect(invocation.file).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(
      /assets\/\.generated\/ccusage-cli\/ccusage\/dist\/index\.js$/,
    );
    expect(invocation.args.slice(1)).toEqual(["daily", "--json"]);
    expect(invocation.commandText).toBe("ccusage daily --json");
  });

  it("can create a blocks report invocation", () => {
    const invocation = createCcusageInvocation("blocks");

    expect(invocation.file).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(
      /assets\/\.generated\/ccusage-cli\/ccusage\/dist\/index\.js$/,
    );
    expect(invocation.args.slice(1)).toEqual(["blocks", "--json"]);
    expect(invocation.commandText).toBe("ccusage blocks --json");
  });
});

describe("normalizeCommandError", () => {
  it("uses the process error message when stderr is empty", () => {
    const cause = Object.assign(new Error("spawn npx ENOENT"), {
      stderr: "",
    });

    const error = normalizeCommandError("ccusage daily --json", cause);

    expect(error.stderr).toBe("spawn npx ENOENT");
  });
});
