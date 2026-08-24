import { afterEach, describe, expect, test } from "vitest";

import { GlossaryError, loadGlossary } from "./glossary";
import { removeTemporaryDirectories, writeGlossary } from "./glossary-test-utils";

afterEach(removeTemporaryDirectories);

describe("loadGlossary decoding and size", () => {
  test("rejects bytes that are not valid UTF-8", async () => {
    const path = await writeGlossary(new Uint8Array([0x74, 0x65, 0x72, 0x6d, 0x73, 0x3a, 0x20, 0xff]));

    await expect(loadGlossary(path)).rejects.toEqual(
      new GlossaryError("invalid-encoding", "The glossary file must use valid UTF-8."),
    );
  });

  test("accepts a 5 MiB file and rejects a larger file", async () => {
    const maximumBytes = 5 * 1024 * 1024;
    const prefix = "terms: []\n#";
    const exactPath = await writeGlossary(prefix + "x".repeat(maximumBytes - Buffer.byteLength(prefix)), "exact.yaml");
    const tooLargePath = await writeGlossary(
      prefix + "x".repeat(maximumBytes - Buffer.byteLength(prefix) + 1),
      "large.yaml",
    );

    await expect(loadGlossary(exactPath)).resolves.toEqual([]);
    await expect(loadGlossary(tooLargePath)).rejects.toEqual(
      new GlossaryError("too-large", "The glossary file is larger than 5 MiB."),
    );
  });
});
