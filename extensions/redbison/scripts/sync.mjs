#!/usr/bin/env node
/**
 * Copies the CLI's own tool code into src/vendor and writes the site catalogue.
 *
 * Why copy rather than import across folders: the Raycast store builds each
 * extension on its own inside raycast/extensions, so nothing outside this
 * folder exists there. Why copy rather than rewrite: the CLI, the VS Code and
 * IntelliJ plugins already answer from one implementation
 * (ide/vscode/src/local.ts and the src/lib/tools modules it imports), and a
 * fourth front end with its own JSON formatter is exactly how the answers
 * drift. The files land at the same relative paths they have in the main repo
 * (src/vendor/cli/src/run.ts's neighbours, src/vendor/ide/..., src/vendor/src/lib/...),
 * so their relative imports resolve unchanged and the copies stay byte-identical,
 * which test/vendor.test.ts checks whenever the source tree is next door.
 *
 * Two layouts carry the sources: the RedBison main repo, where the extension
 * is integrations/raycast (two folders down), and the open-source
 * redbison-dev/redbison-tools repo, where it is raycast/ beside cli/ and ide/
 * (one folder down). findRoot() tries both. Only the main repo has
 * public/ai-tools.json; in the open-source repo the committed
 * site-tools.json is kept as it is.
 *
 * Run with `npm run sync` after the CLI changes. Inside raycast/extensions
 * neither layout exists, so it says so and stops; the committed copies are
 * the source of truth there.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..");
const VENDOR = join(EXT, "src/vendor");

const isSourceRoot = (dir) =>
  existsSync(join(dir, "cli/src/catalog.ts")) && existsSync(join(dir, "ide/vscode/src/local.ts"));
// Main repo (integrations/raycast) first, then the open-source repo (raycast/).
const ROOT = [resolve(EXT, "../.."), resolve(EXT, "..")].find(isSourceRoot);

if (!ROOT) {
  console.error("[sync] Neither the RedBison main repo nor redbison-tools is around this folder, so there is nothing to sync from.");
  process.exit(1);
}

/*
 * The entry points the extension imports. Everything they import with a
 * relative path is followed, so a tool that gains a helper module brings it
 * along without this list changing.
 */
const ENTRIES = [
  "cli/src/catalog.ts", // the tool list, groups and offline flags
  "cli/src/options.ts", // every option each tool takes, with defaults
  "cli/src/args.ts", // coerce() and missingRequired(): the CLI's own option checks
  "cli/src/binary.ts", // BINARY_TOOLS: file-based tools a text selection cannot feed
  "cli/src/examples.ts", // a recorded example input and answer per tool
  "ide/vscode/src/local.ts", // runLocal(): the offline implementations
];

/*
 * cli/src/binary.ts imports the binary inspectors themselves, which would
 * drag in the Parquet and SQLite readers for one exported Set. The extension
 * only needs the Set, so binary.ts is reduced to it below and its imports are
 * not followed.
 */
const SET_ONLY = new Set(["cli/src/binary.ts"]);

const CODE_EXT = [".ts", ".tsx", ".js", ".mjs", ".json"];
// Anchored to the start of a line: generated code inside a string, such as the
// curl converter's "import axios from 'axios';", is output, not an import.
const importRe = /^(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;

function resolveImport(fromRel, spec) {
  const base = resolve(ROOT, dirname(fromRel), spec);
  for (const candidate of [base, ...CODE_EXT.map((e) => base + e), ...CODE_EXT.map((e) => join(base, "index" + e))]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        readFileSync(candidate);
        return relative(ROOT, candidate).split("\\").join("/");
      } catch {
        // a directory; keep looking
      }
    }
  }
  throw new Error(`[sync] ${fromRel} imports ${spec}, which does not resolve`);
}

const files = new Set();
const queue = [...ENTRIES];
while (queue.length) {
  const rel = queue.pop();
  if (files.has(rel)) continue;
  files.add(rel);
  if (SET_ONLY.has(rel)) continue;
  const text = readFileSync(join(ROOT, rel), "utf8");
  for (const m of text.matchAll(importRe)) {
    const spec = m[1];
    if (!spec.startsWith(".")) {
      if (spec.startsWith("node:")) continue;
      throw new Error(`[sync] ${rel} imports the package ${spec}; the extension bundles no third-party tool code`);
    }
    queue.push(resolveImport(rel, spec));
  }
}

// Read before the vendor folder is cleared: without public/ai-tools.json (the
// open-source layout) the committed catalogue is written back unchanged.
const SITE_JSON = join(ROOT, "public/ai-tools.json");
const keptSiteTools = existsSync(SITE_JSON) ? null : readFileSync(join(VENDOR, "site-tools.json"), "utf8");

rmSync(VENDOR, { recursive: true, force: true });
for (const rel of [...files].sort()) {
  const dest = join(VENDOR, rel);
  mkdirSync(dirname(dest), { recursive: true });
  if (SET_ONLY.has(rel)) {
    const text = readFileSync(join(ROOT, rel), "utf8");
    const line = text.split("\n").find((l) => l.startsWith("export const BINARY_TOOLS"));
    if (!line) throw new Error(`[sync] ${rel} no longer exports BINARY_TOOLS on one line`);
    writeFileSync(
      dest,
      `// Reduced by integrations/raycast/scripts/sync.mjs from ${rel}: only the set of\n` +
        `// file-based tools, which a text selection cannot feed. Do not edit.\n${line}\n`,
    );
  } else {
    cpSync(join(ROOT, rel), dest);
  }
}

writeFileSync(
  join(VENDOR, "README.md"),
  `# Vendored from the RedBison repository

Do not edit these files. They are copied unchanged by \`npm run sync\`
(scripts/sync.mjs) from https://github.com/redbison-dev/redbison-tools, at the
same relative paths, so the extension answers with the code the redbison CLI,
the VS Code extension and the IntelliJ plugin run. \`site-tools.json\` is the
public catalogue at https://redbison.dev/ai-tools.json, reduced to the fields
the Search Tools command shows.

${[...files]
  .sort()
  .map((f) => `- ${f}`)
  .join("\n")}
`,
);

// The shared behaviour table every front end is tested against.
mkdirSync(join(EXT, "test/fixtures"), { recursive: true });
cpSync(join(ROOT, "ide/test-cases.json"), join(EXT, "test/fixtures/test-cases.json"));

// The site catalogue, reduced to what a list row shows and searches.
let toolCount;
if (keptSiteTools) {
  writeFileSync(join(VENDOR, "site-tools.json"), keptSiteTools);
  toolCount = `${JSON.parse(keptSiteTools).tools.length} kept`;
} else {
  const site = JSON.parse(readFileSync(SITE_JSON, "utf8"));
  const tools = site.tools.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    url: t.url,
    category: t.category,
    subcategory: t.subcategory,
    ...(t.guide ? { guide: t.guide } : {}),
    keywords: t.keywords ?? [],
  }));
  writeFileSync(join(VENDOR, "site-tools.json"), JSON.stringify({ generated: site.generated, tools }) + "\n");
  toolCount = tools.length;
}

console.log(`[sync] ${files.size} modules and ${toolCount} site tools -> ${relative(process.cwd(), VENDOR)}`);
