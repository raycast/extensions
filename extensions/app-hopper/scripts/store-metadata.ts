import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Check the files that accompany the code in a Store submission. Returns paths to track in Git. */
export function verifyStoreMetadata(root: string): string[] {
  const files = ["README.md", "CHANGELOG.md", "LICENSE", "package.json", "package-lock.json"];
  for (const file of files) {
    if (!readFileSync(path.join(root, file), "utf8").trim()) throw new Error(`${file} must not be empty.`);
  }
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (manifest.license !== "MIT" || !manifest.author) throw new Error("Set the MIT license and Raycast author.");
  if (!readFileSync(path.join(root, "LICENSE"), "utf8").startsWith("MIT License")) {
    throw new Error("LICENSE must contain the MIT license.");
  }
  const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  if (!/^## \[[^\]\n]+\] - (?:\{PR_MERGE_DATE\}|\d{4}-\d{2}-\d{2})$/m.test(changelog)) {
    throw new Error("CHANGELOG.md needs a Raycast version entry: ## [Title] - {PR_MERGE_DATE}.");
  }

  const screenshots = readdirSync(path.join(root, "metadata")).filter((file) => !file.startsWith("."));
  if (screenshots.length < 1 || screenshots.length > 6)
    throw new Error("Include between one and six Store screenshots.");
  for (const file of screenshots) {
    const relative = `metadata/${file}`;
    const image = readFileSync(path.join(root, relative));
    if (
      !file.endsWith(".png") ||
      image.length < 24 ||
      !image.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
      image.toString("ascii", 12, 16) !== "IHDR" ||
      image.readUInt32BE(16) !== 2000 ||
      image.readUInt32BE(20) !== 1250
    ) {
      throw new Error(`${relative} must be a 2000 × 1250 PNG screenshot.`);
    }
    files.push(relative);
  }
  return files;
}
