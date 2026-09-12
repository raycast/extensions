import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const SHIPPED_ROOTS = [
  "src",
  "assets",
  "metadata",
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "dist",
];

test("keeps developer machine paths out of shipped files", async () => {
  const needles = [
    `/Users/${["si", "raj"].join("")}`,
    `C:\\Users\\${["blak", "berri", "sigma"].join("")}`,
    ["192", "168", "1", "26"].join("."),
  ];
  const violations: string[] = [];
  for (const root of SHIPPED_ROOTS) {
    const absolute = path.join(process.cwd(), root);
    if (!fs.existsSync(absolute)) continue;
    for (const filePath of await listFiles(absolute)) {
      const content = await fs.promises.readFile(filePath);
      if (content.includes(0)) continue;
      const text = new TextDecoder("utf-8").decode(content);
      for (const needle of needles) {
        if (text.includes(needle)) {
          violations.push(
            `${path.relative(process.cwd(), filePath)}: ${needle}`,
          );
        }
      }
    }
  }
  assert.deepEqual(violations, []);
});

async function listFiles(root: string): Promise<string[]> {
  const stat = await fs.promises.stat(root);
  if (stat.isFile()) return [root];
  const output: string[] = [];
  for (const entry of await fs.promises.readdir(root, {
    withFileTypes: true,
  })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(child)));
    else if (entry.isFile()) output.push(child);
  }
  return output;
}
