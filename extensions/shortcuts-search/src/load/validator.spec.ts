import Validator, { ValidationError } from "./validator";
import { InputApp } from "../model/input/input-models";

const validator = new Validator(new Map([["e", "10"]]));
describe("Throws validation error", () => {
  it.each(["abc+e", "Ctrl+e", "ctrl+SHIFT+a"])(
    "Throws validation error if incorrect modifier %p",
    (shortcut: string) => {
      expect(() => validator.validate([generateInputAppWithShortcut({ shortcut })])).toThrowError(
        new ValidationError(`Modifier doesn't exist: '${shortcut}'`)
      );
    }
  );

  it.each(["cmd+💩", "cmd+", "cmd+e shift+abc", "cmd+e ctrl+", "cmd+E", "opt+x cmd+P"])(
    "Throw validation error if base key unknown %p",
    (shortcut: string) => {
      expect(() => validator.validate([generateInputAppWithShortcut({ shortcut })])).toThrowError(
        new ValidationError(`Unknown base key for shortcut: '${shortcut}'`)
      );
    }
  );

  it.each(["ctrl", "shift", "cmd", "ctrl", "ctrl+shift+opt+cmd", "ctrl"])(
    "Throws validation error if base key is missing %p",
    (shortcut: string) => {
      expect(() => validator.validate([generateInputAppWithShortcut({ shortcut })])).toThrowError(
        new ValidationError(`Shortcut expression should end with base key: '${shortcut}'`)
      );
    }
  );

  it("Throws validation error if there are whitespace in shortcut", () => {
    expect(() => validator.validate([generateInputAppWithShortcut({ shortcut: "cmd+e +e" })])).toThrowError(
      new ValidationError("Invalid shortcut: 'cmd+e +e'")
    );
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
  ])("Validation succeed if modifiers are in order %p", (shortcut: string) => {
    expect(() => validator.validate([generateInputAppWithShortcut({ shortcut })])).not.toThrowError();
  });
});

function generateInputAppWithShortcut(override?: {
  appBundleId?: string;
  appName?: string;
  keymapTitle?: string;
  sectionTitle?: string;
  title?: string;
  shortcut?: string;
  comment?: string;
}): InputApp {
  return {
    bundleId: override?.appBundleId ?? "some-bundle-id",
    name: override?.appName ?? "some-name",
    slug: "some-slug",
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
