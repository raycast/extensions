import { describe, expect, it } from "vitest";

import {
  checkGsedAvailability,
  runGsedSubstitution,
  type CommandExecutor,
  type CommandResult,
} from "./gsed";

describe("checkGsedAvailability", () => {
  it("returns true when gsed --version succeeds", async () => {
    const executor: CommandExecutor = async () => ({
      code: 0,
      stdout: "ok",
      stderr: "",
    });

    await expect(checkGsedAvailability(executor)).resolves.toBe(true);
  });

  it("falls back to homebrew path when plain gsed is not found", async () => {
    const calls: string[] = [];

    const executor: CommandExecutor = async (command) => {
      calls.push(command);
      if (command === "gsed") {
        return { code: 127, stdout: "", stderr: "not found" };
      }
      if (command === "/opt/homebrew/bin/gsed") {
        return { code: 0, stdout: "gsed (GNU sed) 4.9", stderr: "" };
      }

      return { code: 127, stdout: "", stderr: "not found" };
    };

    await expect(checkGsedAvailability(executor)).resolves.toBe(true);
    expect(calls).toContain("/opt/homebrew/bin/gsed");
  });

  it("returns false when gsed is missing", async () => {
    const executor: CommandExecutor = async () => ({
      code: 127,
      stdout: "",
      stderr: "command not found",
      error: new Error("ENOENT"),
    });

    await expect(checkGsedAvailability(executor)).resolves.toBe(false);
  });
});

describe("runGsedSubstitution", () => {
  it("returns transformed stdout when execution succeeds", async () => {
    let executedCommand = "";

    const executor: CommandExecutor = async (
      command: string,
      args: string[],
      input: string,
    ): Promise<CommandResult> => {
      if (args[0] === "--version") {
        return { code: 0, stdout: "gsed (GNU sed) 4.9", stderr: "" };
      }

      executedCommand = command;
      expect(args).toEqual(["-e", "s/foo/bar/g"]);
      expect(input).toBe("foo foo");
      return { code: 0, stdout: "bar bar", stderr: "" };
    };

    await expect(
      runGsedSubstitution("s/foo/bar/g", "foo foo", executor),
    ).resolves.toBe("bar bar");
    expect(executedCommand).toMatch(/(gsed|\/sed)$/);
  });

  it("throws install guidance when gsed cannot be resolved", async () => {
    const executor: CommandExecutor = async () => ({
      code: 127,
      stdout: "",
      stderr: "not found",
    });

    await expect(
      runGsedSubstitution("s/foo/bar/g", "foo", executor),
    ).rejects.toThrow(/install it with: brew install gnu-sed/i);
  });

  it("throws stderr when execution fails", async () => {
    const executor: CommandExecutor = async (_command, args) => {
      if (args[0] === "--version") {
        return { code: 0, stdout: "gsed (GNU sed) 4.9", stderr: "" };
      }

      return {
        code: 1,
        stdout: "",
        stderr: "unterminated s command",
      };
    };

    await expect(
      runGsedSubstitution("s/foo/bar/g", "foo", executor),
    ).rejects.toThrow(/unterminated/i);
  });
});
