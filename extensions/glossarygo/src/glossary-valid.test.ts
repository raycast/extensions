import { afterEach, describe, expect, test } from "vitest";

import { GlossaryError, loadGlossary } from "./glossary";
import { removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary valid terms", () => {
  test("accepts reordered fields and folded multiline definitions", async () => {
    const path = await writeGlossary(`
terms:
  - definition: >-
      Application Programming
      Interface
    term: API
`);

    await expect(loadGlossary(path)).resolves.toEqual([
      { definition: "Application Programming Interface", term: "API" },
    ]);
  });

  test("loads an empty glossary", async () => {
    const path = await writeGlossary("terms: []\n");

    await expect(loadGlossary(path)).resolves.toEqual([]);
  });

  test("loads a glossary with several thousand entries", async () => {
    const source = `terms:\n${Array.from(
      { length: 3_000 },
      (_, index) => `  - term: Term ${String(index).padStart(4, "0")}\n    definition: Definition ${index}\n`,
    ).join("")}`;
    const path = await writeGlossary(source);

    const terms = await loadGlossary(path);

    expect(terms).toHaveLength(3_000);
    expect(terms.at(-1)).toEqual({ definition: "Definition 2999", term: "Term 2999" });
  });
});

describe("loadGlossary duplicate and safe errors", () => {
  test.each([
    ["case-insensitive", "API", "api"],
    ["canonically equivalent", "éclair", "e\u0301clair"],
    ["Unicode case-equivalent", "ΟΣ", "οσ"],
  ])("rejects %s duplicate terms", async (_label, firstTerm, duplicateTerm) => {
    const path = await writeGlossary(`
terms:
  - term: ${firstTerm}
    definition: First
  - term: ${duplicateTerm}
    definition: Second
`);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("duplicate-term", "Entry 2 duplicates another term near line 5.", 5),
    );
  });

  test("never exposes glossary values in a validation error", async () => {
    const secret = "DO_NOT_EXPOSE_THIS_VALUE";
    const path = await writeGlossary(`terms:\n  - term: API\n    definition: Interface\n    ${secret}: ${secret}\n`);

    const error = await loadGlossary(path).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GlossaryError);
    if (!(error instanceof GlossaryError)) {
      throw new TypeError("Expected loadGlossary to reject with GlossaryError");
    }
    expect(error.message).not.toContain(secret);
  });
});
