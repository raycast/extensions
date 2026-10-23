import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBooks } from "./build-corpus.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const snapshots = new Map();
function register(path, hash) {
  if (!resolve(root, path).startsWith(join(root, ".cache/corpus/sources") + "/"))
    throw new Error(`Invalid cached source path: ${path}`);
  if (!/^[a-f0-9]{64}$/u.test(hash)) throw new Error(`Invalid cached source hash: ${path}`);
  const previous = snapshots.get(path);
  if (previous && previous !== hash) throw new Error(`Conflicting snapshot hashes: ${path}`);
  snapshots.set(path, hash);
}
const books = loadBooks();
for (const source of books) {
  const bookId = source.book.id;
  const ledger = JSON.parse(readFileSync(join(root, `corpus/provenance/${bookId}.json`), "utf8"));
  const records = ledger.snapshots
    ? ledger.snapshots.map((record) => [record.snapshotPath, record])
    : Object.entries(ledger.sources ?? ledger).map(([filename, record]) => [
        `.cache/corpus/sources/${bookId}/${filename}`,
        record,
      ]);
  for (const [path, record] of records) register(path, record.snapshotSha256 ?? record.sha256);
  for (const section of source.sections) {
    if (!snapshots.has(section.snapshotPath)) throw new Error(`Missing acquisition record: ${section.snapshotPath}`);
    register(section.snapshotPath, section.snapshotSha256);
  }
}
for (const [path, expected] of snapshots) {
  let bytes;
  try {
    bytes = readFileSync(join(root, path));
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Missing cached source: ${path}. Fetch sources before auditing.`);
    throw error;
  }
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`Cached source hash changed: ${path}`);
}
console.log(
  `Verified ${snapshots.size} cached sources, including edition and reuse evidence, for all ${books.length} bundled books.`,
);
