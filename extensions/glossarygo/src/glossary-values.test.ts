import { afterEach, describe, expect, test } from "vitest";

import { GlossaryError, loadGlossary } from "./glossary";
import { removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary entry values", () => {
  test.each([
    ["a numeric term", "42"],
    ["a null term", ""],
    ["an empty term", '""'],
    ["a whitespace-padded term", '" API "'],
  ])("rejects %s", async (_label, value) => {
    const path = await writeGlossary(`terms:\n  - term: ${value}\n    definition: Interface\n`);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "invalid-schema",
        "Entry 1 term must be a non-empty string without surrounding whitespace near line 2.",
        2,
      ),
    );
  });

  test.each([
    ["a numeric definition", "42"],
    ["a null definition", ""],
    ["an empty definition", '""'],
  ])("rejects %s", async (_label, value) => {
    const path = await writeGlossary(`terms:\n  - term: API\n    definition: ${value}\n`);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("invalid-schema", "Entry 1 definition must be a non-empty string near line 3.", 3),
    );
  });
});
