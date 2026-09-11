import { commandOrControlShortcut } from "../../src/shortcuts/shortcuts";

describe("commandOrControlShortcut", () => {
  it("maps command to macOS and control to windows", () => {
    expect(commandOrControlShortcut("r")).toEqual({
      macOS: {
        modifiers: ["cmd"],
        key: "r",
      },
      windows: {
        modifiers: ["ctrl"],
        key: "r",
      },
    });
  });

  it("preserves non-letter keys", () => {
    expect(commandOrControlShortcut("backspace")).toEqual({
      macOS: {
        modifiers: ["cmd"],
        key: "backspace",
      },
      windows: {
        modifiers: ["ctrl"],
        key: "backspace",
      },
    });
  });
});
