import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const username = process.argv[2]?.trim();

if (!username) {
  console.error("Usage: npm run setup -- <your-raycast-username>");
  process.exitCode = 1;
} else if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(username)) {
  console.error(
    "The Raycast username may contain letters, numbers, underscores, and hyphens.",
  );
  process.exitCode = 1;
} else {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const manifestPath = resolve(root, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.author = username;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Updated package.json author to ${username}.`);
}
