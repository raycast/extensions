import { describe, test } from "node:test";
import { expect } from "./expect";
import { CommandRunner, executeAsync, runCommand } from "./commandRunner";

describe("executeAsync", () => {
  test("Given a fake runner, When executeAsync is called, Then the fake observes the command and its output is returned", async () => {
    const observed: string[] = [];
    const fake: CommandRunner = {
      exec: async (cmd) => {
        observed.push(cmd);
        return "fake stdout";
      },
      spawn: () => undefined,
    };

    const result = await executeAsync("android docs search compose", fake);

    expect(observed).toEqual(["android docs search compose"]);
    expect(result).toBe("fake stdout");
  });
});

describe("runCommand", () => {
  test("Given a fake runner, When runCommand is called, Then the fake observes the command and the output/error callbacks", () => {
    const observed: Array<{ cmd: string; out?: string; err?: string }> = [];
    const fake: CommandRunner = {
      exec: async () => "",
      spawn: (cmd, output, error) => {
        observed.push({ cmd });
        output?.("streamed out");
        error?.("streamed err");
      },
    };
    const outputs: string[] = [];
    const errors: string[] = [];

    runCommand(
      "emulator @Pixel",
      (out) => outputs.push(out),
      (err) => errors.push(err),
      fake
    );

    expect(observed).toEqual([{ cmd: "emulator @Pixel" }]);
    expect(outputs).toEqual(["streamed out"]);
    expect(errors).toEqual(["streamed err"]);
  });
});
