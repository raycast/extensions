import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}/u;

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, files);
    } else if (/\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("emoji-free source", () => {
  test("no file under src/ contains emoji", () => {
    const files = collectSourceFiles(join(process.cwd(), "src"));
    const offenders = files
      .filter((file) => EMOJI.test(readFileSync(file, "utf8")))
      .map((file) => file.replace(`${process.cwd()}/`, ""));

    expect(offenders).toEqual([]);
  });
});
