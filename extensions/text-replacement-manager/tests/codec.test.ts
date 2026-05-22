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
      { uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["Favorite"], enabled: true },
      { uuid: expect.any(String), trigger: "brb", replacementText: "Be right back", tags: [], enabled: true },
      { uuid: expect.any(String), trigger: "off", replacementText: "Disabled", tags: [], enabled: false },
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
});
