import fs from "node:fs";
import path from "node:path";
import {
  searchSessionIndex,
  updateSessionSearchIndex,
  type SearchIndexSource,
} from "../../src/lib/session-search-index.ts";

const transcripts = process.argv[2];
const index = process.argv[3];
if (!transcripts || !index) {
  throw new Error("Expected transcript and index paths");
}

const fileNames = (await fs.promises.readdir(transcripts))
  .filter((name) => name.endsWith(".jsonl"))
  .sort();
const sources: SearchIndexSource[] = [];
for (const fileName of fileNames) {
  const filePath = path.join(transcripts, fileName);
  const stat = await fs.promises.stat(filePath);
  sources.push({
    filePath,
    sourceProjectDir: transcripts,
    projectPath: "/work/performance",
    projectName: "performance",
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  });
}

const startedAt = Date.now();
await updateSessionSearchIndex(index, sources);
let reopenTranscriptReads = 0;
await updateSessionSearchIndex(index, sources, {
  testHooks: {
    onTranscriptRead: () => reopenTranscriptReads++,
  },
});
let matches = 0;
await searchSessionIndex(index, "unique performance marker", () => matches++);

process.stdout.write(
  JSON.stringify({
    elapsedMs: Date.now() - startedAt,
    files: sources.length,
    matches,
    reopenTranscriptReads,
  }),
);
