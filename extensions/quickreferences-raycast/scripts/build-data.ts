import fs from "node:fs";
import path from "node:path";
import { buildDatasetFromDir } from "../src/ingest/generator";

const POSTS_DIR = path.resolve(__dirname, "../../reference/source/_posts");
const OUTPUT_DIR = path.resolve(__dirname, "../data");

async function main() {
  console.log("Building dataset from:", POSTS_DIR);
  const dataset = await buildDatasetFromDir(POSTS_DIR, {
    sourceLabel: "Fechin/reference (local)",
  });

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    fs.promises.writeFile(
      path.join(OUTPUT_DIR, "meta.json"),
      JSON.stringify(dataset.meta, null, 2),
      "utf8"
    ),
    fs.promises.writeFile(
      path.join(OUTPUT_DIR, "index.json"),
      JSON.stringify(dataset.index, null, 2),
      "utf8"
    ),
    fs.promises.writeFile(
      path.join(OUTPUT_DIR, "content.json"),
      JSON.stringify(dataset.content, null, 2),
      "utf8"
    ),
  ]);

  console.log("Dataset built.");
  console.log(`Total cheat sheets: ${dataset.meta.total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
