import { ShortcutsParser } from "./input-parser";
import { InputApp } from "../model/input/input-models";
import { Application, AtomicShortcut } from "../model/internal/internal-models";
import { Modifiers } from "../model/internal/modifiers";

describe("Parses shortcut correctly", () => {
  const parser = new ShortcutsParser(
    new Map([
      ["e", "10"],
      ["+", "24"],
    ])
  );

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

  it("Skips invalid apps", () => {
    const inputApps = [
      generateInputAppWithShortcut({ appBundleId: "" }),
      generateInputAppWithShortcut({ appName: "" }),
      generateInputAppWithShortcut({ slug: "" }),
      generateInputAppWithShortcut({ keymapTitle: "" }),
      generateInputAppWithShortcut({ sectionTitle: "" }),
      generateInputAppWithShortcut({ title: "" }),
      generateInputAppWithShortcut({ shortcut: "" }),
      generateInputAppWithShortcut({ comment: "" }),
      generateInputAppWithShortcut({ shortcut: "cmd+p" }),
      generateInputAppWithShortcut({ shortcut: "ctrl+e cmd++" }),
    ];

    expect(parser.parseInputShortcuts(inputApps)).toEqual([
      generateExpectedAppWithShortcut({ appBundleId: "" }),
      generateExpectedAppWithShortcut({ comment: "" }),
      generateExpectedAppWithShortcut({
        shortcutSequence: [
          { base: "e", modifiers: [Modifiers.control] },
          { base: "+", modifiers: [Modifiers.command] },
        ],
      }),
    ]);
  });

  it.each(["abc+e", "Ctrl+e", "ctrl+SHIFT+a"])("Skips apps with incorrect modifier %p", (shortcut: string) => {
    expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut })])).toHaveLength(0);
  });

  it.each(["cmd+💩", "cmd+", "cmd+e shift+abc", "cmd+e ctrl+", "cmd+E", "opt+x cmd+P"])(
    "Skips app if base key unknown %p",
    (shortcut: string) => {
      expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut })])).toHaveLength(0);
    }
  );

  it.each(["ctrl", "shift", "cmd", "ctrl", "ctrl+shift+opt+cmd", "ctrl"])(
    "Skips app if base key is missing %p",
    (shortcut: string) => {
      expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut })])).toHaveLength(0);
    }
  );

  it("Skips app if there are unexpected whitespace in shortcut", () => {
    expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut: "cmd +e" })])).toHaveLength(0);
  });

  it.each([
    "ctrl+shift+opt+cmd+e",
    "ctrl+opt+cmd+e",
    "shift+opt+e",
    "ctrl+shift+e",
    "opt+cmd+e",
    "ctrl+cmd+e",
    "ctrl+shift+opt+e",
    "ctrl+shift+cmd+e",
    "ctrl+opt+cmd+e",
    "shift+opt+cmd+e",
    "ctrl+shift+opt+cmd+e ctrl+opt+cmd+e shift+opt+e ctrl+shift+e opt+cmd+e ctrl+cmd+e ctrl+shift+opt+e ctrl+shift+cmd+e ctrl+opt+cmd+e shift+opt+cmd+e",
  ])("Parses apps with different modifiers %p", (shortcut: string) => {
    expect(parser.parseInputShortcuts([generateInputAppWithShortcut({ shortcut })])).toHaveLength(1); // todo: pass all of them at once
  });
});

function generateInputAppWithShortcut(override?: {
  appBundleId?: string;
  appName?: string;
  slug?: string;
  keymapTitle?: string;
  sectionTitle?: string;
  title?: string;
  shortcut?: string;
  comment?: string;
}): InputApp {
  return {
    bundleId: override?.appBundleId ?? "some-bundle-id",
    name: override?.appName ?? "some-name",
    slug: override?.slug ?? "some-slug",
    keymaps: [
      {
        title: override?.keymapTitle ?? "Default",
        sections: [
          {
            title: override?.sectionTitle ?? "section-name",
            shortcuts: [
              {
                title: override?.title ?? "shortcut",
                key: override?.shortcut ?? "cmd+e",
                comment: override?.comment ?? "some-comment",
              },
            ],
          },
        ],
      },
    ],
  };
}

function generateExpectedAppWithShortcut(override?: {
  appBundleId?: string;
  comment?: string;
  shortcutSequence?: AtomicShortcut[];
}): Application {
  return {
    bundleId: override?.appBundleId ?? "some-bundle-id",
    name: "some-name",
    slug: "some-slug",
    keymaps: [
      {
        title: "Default",
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
                comment: override?.comment ?? "some-comment",
              },
            ],
          },
        ],
      },
    ],
  };
}
