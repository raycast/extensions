/**
 * Mirrors src/api/pr-activity.graphql into a TypeScript string constant.
 *
 * The .graphql file is the source of truth (codegen reads it), but `ray build` cannot import
 * .graphql at runtime and we deliberately ship no GraphQL client library — so the query text has
 * to exist as TypeScript. Run via `npm run generate`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "src/api/pr-activity.graphql";
const TARGET = "src/api/pr-activity-query.ts";

const source = readFileSync(SOURCE, "utf8");
const metadataMarker = "# --- METADATA OPERATION ---";
const pageMarker = "# --- PAGE OPERATION ---";
const byNumberMarker = "# --- BY-NUMBER OPERATION ---";
const metadataStart = source.indexOf(metadataMarker);
const pageStart = source.indexOf(pageMarker);
const byNumberStart = source.indexOf(byNumberMarker);

if (
  metadataStart < 0 ||
  pageStart < 0 ||
  byNumberStart < 0 ||
  pageStart <= metadataStart ||
  byNumberStart <= pageStart
) {
  throw new Error(`Expected ${SOURCE} to contain ordered metadata, page, and by-number operation markers`);
}

const fragments = source.slice(0, metadataStart).trimEnd();
const metadataOperation = source.slice(metadataStart + metadataMarker.length, pageStart).trim();
const pageOperation = source.slice(pageStart + pageMarker.length, byNumberStart).trim();
const byNumberOperation = source.slice(byNumberStart + byNumberMarker.length).trim();
const metadataQuery = metadataOperation;
const pageQuery = `${fragments}\n\n${pageOperation}`;
const byNumberQuery = `${fragments}\n\n${byNumberOperation}`;

// Emitted via JSON.stringify rather than a template literal: the source contains backticks (in
// its own comments), which would terminate a template literal early and produce a file that
// looks plausible but fails to parse. JSON escaping handles every character safely.
writeFileSync(
  TARGET,
  [
    `// AUTO-GENERATED from ${SOURCE} — do not edit. Run \`npm run generate\`.`,
    "// The .graphql file is the source of truth; this mirrors it as a string because ray build",
    "// cannot import .graphql at runtime and we ship no GraphQL client library.",
    "",
    "export const PR_METADATA_QUERY =",
    `  ${JSON.stringify(metadataQuery)};`,
    "export const PR_ACTIVITY_QUERY =",
    `  ${JSON.stringify(pageQuery)};`,
    "export const PR_ACTIVITY_BY_NUMBER_QUERY =",
    `  ${JSON.stringify(byNumberQuery)};`,
    "",
  ].join("\n"),
);

console.log(`sync-query: wrote ${TARGET} (${(source.length / 1024).toFixed(1)} KB)`);
