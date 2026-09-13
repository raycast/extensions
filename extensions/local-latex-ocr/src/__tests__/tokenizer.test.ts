import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LatexTokenizer } from "../lib/tokenizer";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("LatexTokenizer", () => {
  it("decodes model IDs and strips special tokens", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "latex-tokenizer-"));
    temporaryDirectories.push(directory);
    const file = path.join(directory, "tokenizer.json");
    await writeFile(
      file,
      JSON.stringify({
        model: { vocab: { "[BOS]": 1, "[EOS]": 2, "\\\\frac": 3, "{": 4, x: 5, "}": 6, "Ġ+": 7 } },
        added_tokens: [
          { id: 1, content: "[BOS]", special: true },
          { id: 2, content: "[EOS]", special: true },
        ],
      }),
    );
    const tokenizer = await LatexTokenizer.fromFile(file);
    expect(tokenizer.decode([1, 3, 4, 5, 6, 7, 5, 2])).toBe("\\\\frac{x} +x");
  });
});
