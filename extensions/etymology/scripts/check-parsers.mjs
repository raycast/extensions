// Smoke test for the two parsers, against live Wiktionary.
//
// Everything in src/sources/ reads a shape Wiktionary is free to change without
// telling anyone: template argument order, and an HTML attribute holding JSON.
// Nothing in a typechecker or a lint rule notices when that shape moves, so this
// asks for a handful of words whose ancestry is not in dispute and checks the
// answers still come back.
//
//   node scripts/check-parsers.mjs
//
// Bundles src/ first, with @raycast/api replaced by the little of it the parsers
// touch, so the modules can run outside the Raycast host.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const STUB = `
  export const environment = { assetsPath: ${JSON.stringify(join(root, "assets"))} };
  export class Cache {
    get() {} set() {} remove() {} clear() {}
  }
  export const LocalStorage = {
    async getItem() {}, async setItem() {}, async removeItem() {},
  };
  export function getPreferenceValues() { return {}; }
`;

const stubPlugin = {
  name: "raycast-api-stub",
  setup(b) {
    b.onResolve({ filter: /^@raycast\/api$/ }, () => ({ path: "stub", namespace: "raycast" }));
    b.onLoad({ filter: /.*/, namespace: "raycast" }, () => ({ contents: STUB, loader: "js" }));
  },
};

const bundled = await build({
  stdin: {
    contents: `
      export { fetchEntry } from "./src/sources/index";
      export { chainOneLine, treeMarkdown, plainSummary } from "./src/render";
      export { spine, ancestors } from "./src/model";
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  write: false,
  plugins: [stubPlugin],
});

const mod = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

// [word, must appear in the rendered tree or prose, expected source rung]
const CASES = [
  ["water", ["Proto-Indo-European", "Old English", "wæter"], "tree"],
  ["algebra", ["Arabic", "Medieval Latin"], "tree"],
  ["sarcasm", ["Ancient Greek"], "tree"],
  ["computer", ["Latin", "Proto-Italic"], "tree"],
  ["sheriff", ["Old English", "Middle English"], "tree"],
  // No {{etymon}}, so these exercise the wikitext template parser instead.
  ["quixotic", ["Spanish", "Quixote"], "templates"],
  ["salary", ["Latin", "Middle English"], "templates"],
  ["manifold", ["Old English"], "templates"],
];

let failures = 0;

for (const [word, expected, rung] of CASES) {
  let entry;
  try {
    entry = await mod.fetchEntry(word);
  } catch (error) {
    console.log(`FAIL ${word}: ${error.message}`);
    failures++;
    continue;
  }

  const rendered = entry.sections
    .map((s) => [s.tree ? mod.treeMarkdown(s.tree) : "", s.prose ?? ""].join("\n"))
    .join("\n");

  const missing = expected.filter((e) => !rendered.includes(e));
  const wrongRung = entry.source !== rung;

  if (missing.length || wrongRung) {
    failures++;
    console.log(`FAIL ${word}`);
    if (missing.length) console.log(`     missing: ${missing.join(", ")}`);
    if (wrongRung) console.log(`     source: got "${entry.source}", expected "${rung}"`);
    console.log(rendered.split("\n").slice(0, 14).map((l) => `     ${l}`).join("\n"));
  } else {
    const tree = entry.sections.find((s) => s.tree)?.tree;
    console.log(`ok   ${word.padEnd(10)} [${entry.source}]  ${tree ? mod.chainOneLine(tree) : ""}`);
  }
}

console.log(failures === 0 ? `\nall ${CASES.length} passed` : `\n${failures} of ${CASES.length} failed`);
process.exit(failures === 0 ? 0 : 1);
