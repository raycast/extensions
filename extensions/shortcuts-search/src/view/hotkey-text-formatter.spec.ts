import { generateHotkeyText, generateHotkeyAccessories } from "./hotkey-text-formatter";
import { SectionShortcut } from "../model/internal/internal-models";
import { Modifiers } from "../model/internal/modifiers";

describe("hotkey-text-formatter", () => {
  describe("generateHotkeyText", () => {
    describe("macOS", () => {
      it("formats simple shortcut with command modifier", () => {
        const shortcut: SectionShortcut = {
          title: "Save",
          sequence: [
            {
              base: "s",
              modifiers: [Modifiers.command],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "macos")).toBe("⌘S");
      });

      it("formats shortcut with multiple modifiers", () => {
        const shortcut: SectionShortcut = {
          title: "Quit",
          sequence: [
            {
              base: "q",
              modifiers: [Modifiers.command, Modifiers.shift],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "macos")).toBe("⌘⇧Q");
      });

      it("formats shortcut with special key", () => {
        const shortcut: SectionShortcut = {
          title: "New Tab",
          sequence: [
            {
              base: "tab",
              modifiers: [Modifiers.command],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "macos")).toBe("⌘⇥");
      });

      it("formats shortcut with arrow key", () => {
        const shortcut: SectionShortcut = {
          title: "Move Left",
          sequence: [
            {
              base: "left",
              modifiers: [Modifiers.option],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "macos")).toBe("⌥←");
      });

      it("formats chord sequence", () => {
        const shortcut: SectionShortcut = {
          title: "Open Keyboard Shortcuts",
          sequence: [
            {
              base: "k",
              modifiers: [Modifiers.command],
            },
            {
              base: "s",
              modifiers: [Modifiers.command],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "macos")).toBe("⌘K ⌘S");
      });
    });

    describe("Windows", () => {
      it("formats simple shortcut with ctrl modifier", () => {
        const shortcut: SectionShortcut = {
          title: "Save",
          sequence: [
            {
              base: "s",
              modifiers: [Modifiers.control],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Ctrl+S");
      });

      it("formats shortcut with multiple modifiers", () => {
        const shortcut: SectionShortcut = {
          title: "Quit",
          sequence: [
            {
              base: "q",
              modifiers: [Modifiers.control, Modifiers.shift],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Ctrl+Shift+Q");
      });

      it("formats shortcut with alt modifier", () => {
        const shortcut: SectionShortcut = {
          title: "Alt+F4",
          sequence: [
            {
              base: "f4",
              modifiers: [Modifiers.option],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Alt+F4");
      });

      it("formats shortcut with special key", () => {
        const shortcut: SectionShortcut = {
          title: "New Tab",
          sequence: [
            {
              base: "tab",
              modifiers: [Modifiers.control],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Ctrl+Tab");
      });

      it("formats shortcut with arrow key", () => {
        const shortcut: SectionShortcut = {
          title: "Move Left",
          sequence: [
            {
              base: "left",
              modifiers: [Modifiers.option],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Alt+Left");
      });

      it("formats chord sequence", () => {
        const shortcut: SectionShortcut = {
          title: "Open Keyboard Shortcuts",
          sequence: [
            {
              base: "k",
              modifiers: [Modifiers.control],
            },
            {
              base: "s",
              modifiers: [Modifiers.control],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Ctrl+K Ctrl+S");
      });

      it("formats shortcut with win modifier", () => {
        const shortcut: SectionShortcut = {
          title: "Settings",
          sequence: [
            {
              base: "i",
              modifiers: [Modifiers.win],
            },
          ],
        };

        expect(generateHotkeyText(shortcut, "windows")).toBe("Win+I");
      });
    });
  });

  describe("generateHotkeyAccessories", () => {
    describe("macOS", () => {
      it("generates accessories for simple shortcut", () => {
        const shortcut: SectionShortcut = {
          title: "Save",
          sequence: [
            {
              base: "s",
              modifiers: [Modifiers.command],
            },
          ],
        };

        const accessories = generateHotkeyAccessories(shortcut, "macos");

        expect(accessories).toHaveLength(1);
        expect(accessories[0]).toEqual({ tag: "⌘ S" });
      });

      it("generates accessories for chord sequence", () => {
        const shortcut: SectionShortcut = {
          title: "Open Keyboard Shortcuts",
          sequence: [
            {
              base: "k",
              modifiers: [Modifiers.command],
            },
            {
              base: "s",
              modifiers: [Modifiers.command],
            },
          ],
        };

        const accessories = generateHotkeyAccessories(shortcut, "macos");

        expect(accessories).toHaveLength(3);
        expect(accessories[0]).toEqual({ tag: "⌘ K" });
        expect(accessories[1]).toEqual({ text: "then" });
        expect(accessories[2]).toEqual({ tag: "⌘ S" });
      });
    });

    describe("Windows", () => {
      it("generates accessories for simple shortcut", () => {
        const shortcut: SectionShortcut = {
          title: "Save",
          sequence: [
            {
              base: "s",
              modifiers: [Modifiers.control],
            },
          ],
        };

        const accessories = generateHotkeyAccessories(shortcut, "windows");

        expect(accessories).toHaveLength(1);
        expect(accessories[0]).toEqual({ tag: "Ctrl+S" });
      });

      it("generates accessories for chord sequence", () => {
        const shortcut: SectionShortcut = {
          title: "Open Keyboard Shortcuts",
          sequence: [
            {
              base: "k",
              modifiers: [Modifiers.control],
            },
            {
              base: "s",
              modifiers: [Modifiers.control],
            },
          ],
        };

        const accessories = generateHotkeyAccessories(shortcut, "windows");

        expect(accessories).toHaveLength(3);
        expect(accessories[0]).toEqual({ tag: "Ctrl+K" });
        expect(accessories[1]).toEqual({ text: "then" });
        expect(accessories[2]).toEqual({ tag: "Ctrl+S" });
      });

      it("generates accessories for shortcut with multiple modifiers", () => {
        const shortcut: SectionShortcut = {
          title: "Quit",
          sequence: [
            {
              base: "q",
              modifiers: [Modifiers.control, Modifiers.shift],
            },
          ],
        };

        const accessories = generateHotkeyAccessories(shortcut, "windows");

        expect(accessories).toHaveLength(1);
        expect(accessories[0]).toEqual({ tag: "Ctrl+Shift+Q" });
      });
    });
  });
});
