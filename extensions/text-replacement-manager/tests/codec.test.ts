import { describe, expect, it } from "vitest";

import { exportReplacementsToJson, parseImportedReplacements } from "../src/lib/import-export";
import { mergeSystemWithMetadata, serializeSystemItems } from "../src/lib/system-replacements";

describe("system replacement mapping", () => {
  it("merges macOS replacement rows with extension metadata", () => {
    const replacements = mergeSystemWithMetadata(
      [
        { replace: "omw", with: "On my way!", on: "1" },
        { replace: "brb", with: "Be right back" },
        { replace: "off", with: "Disabled", on: "0" },
      ],
      {
        "omw": { uuid: "uuid-omw", tags: ["Favorite"] },
      },
    );

    expect(replacements).toEqual([
      { uuid: expect.any(String), trigger: "brb", replacementText: "Be right back", tags: [], enabled: true },
      { uuid: expect.any(String), trigger: "off", replacementText: "Disabled", tags: [], enabled: false },
      { uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["Favorite"], enabled: true },
    ]);
  });

  it("sorts merged replacements by trigger using natural order", () => {
    const replacements = mergeSystemWithMetadata(
      [
        { replace: "maxl", with: "maxludden" },
        { replace: "_.25", with: "¼" },
        { replace: "_cmd", with: "⌘" },
        { replace: "att", with: "AT&T" },
        { replace: "_.5", with: "½" },
      ],
      {},
    );

    expect(replacements.map((replacement) => replacement.trigger)).toEqual([
      "_.5",
      "_.25",
      "_cmd",
      "att",
      "maxl",
    ]);
  });

  it("serializes replacements back to macOS rows", () => {
    expect(
      serializeSystemItems([
        { uuid: "1", trigger: "omw", replacementText: "On my way!", tags: [], enabled: true },
        { uuid: "2", trigger: "off", replacementText: "Off", tags: [], enabled: false },
      ]),
    ).toEqual([
      { replace: "omw", with: "On my way!", on: 1 },
      { replace: "off", with: "Off", on: 0 },
    ]);
  });
});

describe("import and export JSON schema", () => {
  it("exports the requested dictionary shape", () => {
    const exported = exportReplacementsToJson([
      { uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["Favorite"], enabled: true },
    ]);

    expect(JSON.parse(exported)).toEqual({
      "Text Replacements": [
        {
          uuid: "uuid-omw",
          trigger: "omw",
          "replacement-text": "On my way!",
          tags: ["Favorite"],
        },
      ],
    });
  });

  it("exports tag colors for tags in the exported replacements", () => {
    const exported = exportReplacementsToJson(
      [
        { uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["Favorite"], enabled: true },
      ],
      {
        Favorite: "Blue",
        Unused: "Red",
      },
    );

    expect(JSON.parse(exported)).toEqual({
      "Text Replacements": [
        {
          uuid: "uuid-omw",
          trigger: "omw",
          "replacement-text": "On my way!",
          tags: ["Favorite"],
        },
      ],
      "Tag Colors": {
        Favorite: "Blue",
      },
    });
  });

  it("imports valid schema and rejects conflicts", () => {
    const imported = parseImportedReplacements(
      JSON.stringify({
        "Text Replacements": [
          { uuid: "uuid-brb", trigger: "brb", "replacement-text": "Be right back", tags: ["chat"] },
          { uuid: "uuid-omw", trigger: "omw", "replacement-text": "On my way!", tags: ["default"] },
        ],
      }),
      [{ uuid: "existing", trigger: "omw", replacementText: "On my way!", tags: [], enabled: true }],
    );

    expect(imported).toEqual({
      accepted: [{ uuid: "uuid-brb", trigger: "brb", replacementText: "Be right back", tags: ["chat"], enabled: true }],
      skipped: ["omw"],
      tagColors: {},
    });

    expect(() =>
      parseImportedReplacements(
        JSON.stringify({
          "Text Replacements": [{ uuid: "uuid-omw", trigger: "omw", "replacement-text": "Different", tags: [] }],
        }),
        [{ uuid: "existing", trigger: "omw", replacementText: "On my way!", tags: [], enabled: true }],
      ),
    ).toThrow("conflicts with an existing replacement");
  });

  it("rejects duplicate triggers even when they match existing replacements", () => {
    expect(() =>
      parseImportedReplacements(
        JSON.stringify({
          "Text Replacements": [
            { uuid: "uuid-1", trigger: "omw", "replacement-text": "On my way!", tags: [] },
            { uuid: "uuid-2", trigger: "omw", "replacement-text": "On my way!", tags: [] },
          ],
        }),
        [{ uuid: "existing", trigger: "omw", replacementText: "On my way!", tags: [], enabled: true }],
      ),
    ).toThrow('Trigger "omw" appears more than once in the import file.');
  });

  it("imports tag colors for known imported and existing tags", () => {
    const imported = parseImportedReplacements(
      JSON.stringify({
        "Text Replacements": [
          { uuid: "uuid-brb", trigger: "brb", "replacement-text": "Be right back", tags: ["chat"] },
        ],
        "Tag Colors": {
          chat: "Blue",
          existing: "Red",
          unknown: "Green",
          invalid: "NotAColor",
        },
      }),
      [{ uuid: "existing", trigger: "omw", replacementText: "On my way!", tags: ["existing"], enabled: true }],
    );

    expect(imported.tagColors).toEqual({
      chat: "Blue",
      existing: "Red",
    });
  });
});
