import {
  arxivProvider,
  catalogMirrorsProvider,
  coreProvider,
  crossrefProvider,
  doajProvider,
  europePmcProvider,
  googleBooksProvider,
  internetArchiveProvider,
  openAlexProvider,
  openLibraryProvider,
  projectGutenbergProvider,
  pubMedCentralProvider,
  semanticScholarProvider,
  unpaywallProvider,
  zenodoProvider,
} from "../src/providers";
import type { SearchProvider } from "../src/types";

type Check = {
  provider: SearchProvider;
  query: string;
  requires?: "email" | "googleBooksKey" | "semanticScholarKey";
};

const checks: Check[] = [
  { provider: openLibraryProvider, query: "Pride and Prejudice Jane Austen" },
  { provider: crossrefProvider, query: "10.1038/s41586-020-2649-2" },
  { provider: openAlexProvider, query: "10.1038/s41586-020-2649-2" },
  { provider: europePmcProvider, query: "10.1038/s41586-020-2649-2" },
  { provider: internetArchiveProvider, query: "Pride and Prejudice Jane Austen" },
  { provider: arxivProvider, query: "quantum computing" },
  { provider: doajProvider, query: "machine learning" },
  { provider: pubMedCentralProvider, query: "machine learning" },
  { provider: projectGutenbergProvider, query: "Pride and Prejudice Jane Austen" },
  {
    provider: semanticScholarProvider,
    query: "10.1038/s41586-020-2649-2",
    requires: "semanticScholarKey",
  },
  { provider: coreProvider, query: "quantum computing" },
  { provider: zenodoProvider, query: "quantum computing" },
  { provider: catalogMirrorsProvider, query: "Pride and Prejudice Jane Austen" },
  { provider: unpaywallProvider, query: "10.1038/s41586-020-2649-2", requires: "email" },
  {
    provider: googleBooksProvider,
    query: "Pride and Prejudice Jane Austen",
    requires: "googleBooksKey",
  },
];

async function main(): Promise<void> {
  let failed = 0;
  for (const check of checks) {
    if (check.requires === "email" && !process.env.CONTACT_EMAIL) {
      console.log(`SKIP ${check.provider.name}: set CONTACT_EMAIL to test it`);
      continue;
    }
    if (
      check.requires === "googleBooksKey" &&
      !process.env.GOOGLE_BOOKS_API_KEY
    ) {
      console.log(
        `SKIP ${check.provider.name}: set GOOGLE_BOOKS_API_KEY to test it`,
      );
      continue;
    }
    if (
      check.requires === "semanticScholarKey" &&
      !process.env.SEMANTIC_SCHOLAR_API_KEY
    ) {
      console.log(
        `SKIP ${check.provider.name}: set SEMANTIC_SCHOLAR_API_KEY to test it`,
      );
      continue;
    }
    try {
      const results = await check.provider.search(check.query, {
      signal: AbortSignal.timeout(25_000),
      contactEmail: process.env.CONTACT_EMAIL,
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
      semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY,
      coreApiKey: process.env.CORE_API_KEY,
      });
      if (!results.length) {
        console.log(`FAIL ${check.provider.name}: request worked but returned no test results`);
        failed += 1;
        continue;
      }
      const downloads = results.flatMap((result) => result.accessLinks).filter((link) => link.kind === "download").length;
      console.log(`PASS ${check.provider.name}: ${results.length} result(s), ${downloads} direct open download(s)`);
    } catch (error) {
      console.log(`FAIL ${check.provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      failed += 1;
    }
  }

  if (failed) {
    console.error(`\n${failed} source check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll configured source checks passed.");
  }
}

void main();
