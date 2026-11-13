jest.mock("../config/catalog", () => ({ catalogUrl: (path: string) => path }));
jest.mock("@raycast/utils", () => ({ useFetch: jest.fn() }));
import { getWindowsKeyNames } from "./key-codes-provider";
import { ShortcutsParser } from "./input-parser";
it("parses the actual Windows dictionary, including punctuation and Win chords", () => {
  const keys = getWindowsKeyNames();
  const app = new ShortcutsParser(keys).parseInputShortcuts([
    {
      name: "Windows",
      slug: "windows",
      keymaps: [
        {
          title: "Windows",
          platforms: ["windows"],
          sections: [{ title: "Edit", shortcuts: [{ title: "Zoom", key: "ctrl++ win+left" }] }],
        },
      ],
    },
  ]);
  expect(app).toHaveLength(1);
  expect(app[0].keymaps[0].sections[0].hotkeys[0].sequence).toEqual([
    { base: "+", modifiers: ["control down"] },
    { base: "left", modifiers: ["win down"] },
  ]);
  for (const base of ["a", "z", "0", "9", "f1", "f24", "insert", "escape", "+", "{"]) expect(keys).toHaveProperty(base);
  expect(keys).not.toHaveProperty("unknown");
});
