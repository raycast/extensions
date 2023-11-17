import { ShortcutsParser } from "./input-parser";
import { InputApp } from "../model/input/input-models";
import { Application, AtomicShortcut } from "../model/internal/internal-models";
import { Modifiers } from "../model/internal/modifiers";

describe("Parses shortcut correctly", () => {
  const parser = new ShortcutsParser();

  it("Parses app shortcut", () => {
    expect(parser.parseInputShortcuts([generateInputAppWithShortcut()])).toEqual([generateExpectedAppWithShortcut()]);
  });

  it("Parses app without bundleId", () => {
    const inputApp = generateInputAppWithShortcut();
    inputApp.bundleId = undefined;
    const expectedApplication = generateExpectedAppWithShortcut();
    expectedApplication.bundleId = undefined;

    expect(parser.parseInputShortcuts([inputApp])).toEqual([expectedApplication]);
  });

  it("Parses shortcut without modifiers", () => {
    const expectedShortcutSequence: AtomicShortcut[] = [
      {
        base: "e",
        modifiers: [],
      },
    ];

    expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut: "e" })])).toEqual([
      generateExpectedAppWithShortcut({
        shortcutSequence: expectedShortcutSequence,
      }),
    ]);
  });
});

function generateInputAppWithShortcut(override?: { shortcut: string }): InputApp {
  return {
    bundleId: "some-bundle-id",
    name: "some-name",
    slug: "some-slug",
    keymaps: [
      {
        title: "keymap-name",
        sections: [
          {
            title: "section-name",
            shortcuts: [
              {
                title: "shortcut",
                key: override?.shortcut ?? "cmd+e",
              },
            ],
          },
        ],
      },
    ],
  };
}

function generateExpectedAppWithShortcut(override?: { shortcutSequence?: AtomicShortcut[] }): Application {
  return {
    bundleId: "some-bundle-id",
    name: "some-name",
    slug: "some-slug",
    keymaps: [
      {
        title: "keymap-name",
        sections: [
          {
            title: "section-name",
            hotkeys: [
              {
                title: "shortcut",
                sequence: override?.shortcutSequence ?? [
                  {
                    base: "e",
                    modifiers: [Modifiers.command],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
