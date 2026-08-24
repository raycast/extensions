import { afterEach, describe, expect, test } from "vitest";

import { GlossaryError, loadGlossary } from "./glossary";
import { removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary root schema", () => {
  test("reports an unknown root field even when it precedes terms", async () => {
    const path = await writeGlossary("version: 1\nterms: []\n");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("invalid-schema", "The glossary root must contain exactly one terms sequence near line 1.", 1),
    );
  });

  test.each([
    ["a sequence root", "- API\n", 1],
    ["a missing terms field", "version: 1\n", 1],
    ["an extra root field", "terms: []\nversion: 1\n", 2],
    ["a non-sequence terms value", "terms: {}\n", 1],
  ])("rejects %s", async (_label, source, line) => {
    const path = await writeGlossary(source);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "invalid-schema",
        `The glossary root must contain exactly one terms sequence near line ${line}.`,
        line,
      ),
    );
  });
});

describe("loadGlossary entry fields", () => {
  test("reports an unknown entry field even when it precedes required fields", async () => {
    const path = await writeGlossary("terms:\n  - category: Technical\n    term: API\n    definition: Interface\n");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "invalid-schema",
        "Entry 1 must contain exactly the term and definition fields near line 2.",
        2,
      ),
    );
  });

  test.each([
    ["a non-mapping entry", "terms:\n  - API\n", 1, 2],
    ["a missing entry field", "terms:\n  - term: API\n", 1, 2],
    ["an extra entry field", "terms:\n  - term: API\n    definition: Interface\n    category: Technical\n", 1, 4],
  ])("rejects %s", async (_label, source, entryNumber, line) => {
    const path = await writeGlossary(source);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "invalid-schema",
        `Entry ${entryNumber} must contain exactly the term and definition fields near line ${line}.`,
        line,
      ),
    );
  });
});
