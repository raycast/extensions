import { crossrefProvider, openAlexProvider, openLibraryProvider } from "../src/providers";
import { mergeAndRankResults } from "../src/lib/merge-results";
import type { AdvancedSearchQuery } from "../src/types";

const advanced: AdvancedSearchQuery = { title: "Identity in Physics", authors: "French Krause", kind: "book", exactTitle: true };
const query = "Identity in Physics French Krause";

async function main() {
  const settled = await Promise.allSettled([crossrefProvider, openAlexProvider, openLibraryProvider].map((provider) => provider.search(query, { signal: AbortSignal.timeout(25_000), advanced })));
  const raw = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const merged = mergeAndRankResults(raw, query, advanced);
  console.log(`Fetched ${raw.length} records; retained ${merged.length} consolidated exact result(s).`);
  for (const work of merged) console.log(`${work.title} — ${work.authors.join(", ")} — ${work.sources.join(", ")}`);
  if (!merged.length) process.exitCode = 1;
}

void main();
