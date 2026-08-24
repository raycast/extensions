import { afterEach, describe, expect, test } from "vitest";

import { GlossaryError, loadGlossary } from "./glossary";
import { removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary YAML documents", () => {
  test("reports malformed YAML safely with a source line", async () => {
    const path = await writeGlossary("terms: [}\n");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("invalid-yaml", "The glossary contains invalid YAML near line 1.", 1),
    );
  });

  test("rejects streams with more than one YAML document", async () => {
    const path = await writeGlossary("terms: []\n---\nterms: []\n");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("multiple-documents", "The glossary must contain exactly one YAML document near line 2.", 2),
    );
  });
});

describe("loadGlossary unsupported YAML", () => {
  test.each([
    ["an explicit YAML directive", "%YAML 1.2\n---\nterms: []\n"],
    ["a tag directive", "%TAG !e! tag:example.com,2026:\n---\nterms: []\n"],
    ["an unknown directive", "%FOO bar\n---\nterms: []\n"],
  ])("rejects %s", async (_label, source) => {
    const path = await writeGlossary(source);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("unsupported-yaml", "The glossary uses an unsupported YAML construct near line 1.", 1),
    );
  });

  test.each([
    ["an anchor", "terms: &terms []\n", 1],
    ["an alias", "terms: *missing\n", 1],
    ["an anchor with an alias", "terms:\n  - &shared { term: API, definition: Interface }\n  - *shared\n", 2],
    ["a merge key", "terms:\n  - <<: { term: API }\n    definition: Interface\n", 2],
    ["an explicit tag", "terms: !!seq []\n", 1],
    ["a custom tag", "terms: !glossary []\n", 1],
  ])("rejects %s as an unsupported YAML construct", async (_label, source, line) => {
    const path = await writeGlossary(source);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("unsupported-yaml", `The glossary uses an unsupported YAML construct near line ${line}.`, line),
    );
  });
});
