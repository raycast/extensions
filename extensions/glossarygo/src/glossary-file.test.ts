import { afterEach, describe, expect, test } from "vitest";
import { chmod, mkdir } from "node:fs/promises";

import { GlossaryError, loadGlossary } from "./glossary";
import { createTemporaryPath, removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary file selection", () => {
  test("loads a valid glossary without changing definition content", async () => {
    const path = await writeGlossary(`
# Product language
terms:
  - term: API
    definition: "Application Programming Interface"
  - term: ADR
    definition: |
      A short record of an architectural decision
      and the reasons behind it.
`);

    await expect(loadGlossary(path)).resolves.toEqual([
      { definition: "Application Programming Interface", term: "API" },
      {
        definition: "A short record of an architectural decision\nand the reasons behind it.\n",
        term: "ADR",
      },
    ]);
  });

  test("rejects files that do not use the .yaml extension", async () => {
    const path = await writeGlossary("terms: []\n", "glossary.yml");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("invalid-extension", "Choose a file with the .yaml extension."),
    );
  });
});

describe("loadGlossary file access", () => {
  test("reports a safe error when the glossary file is missing", async () => {
    const path = await createTemporaryPath("missing.yaml");

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "unreadable",
        "The glossary file could not be read. Check that it still exists and is accessible.",
      ),
    );
  });

  test("reports a safe error when the selected path is not a readable file", async () => {
    const path = await createTemporaryPath("directory.yaml");
    await mkdir(path);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "unreadable",
        "The glossary file could not be read. Check that it still exists and is accessible.",
      ),
    );
  });

  test.skipIf(process.platform === "win32")("reports a safe error for an unreadable regular file", async () => {
    const path = await writeGlossary("terms: []\n");
    await chmod(path, 0o000);

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError(
        "unreadable",
        "The glossary file could not be read. Check that it still exists and is accessible.",
      ),
    );
  });
});
