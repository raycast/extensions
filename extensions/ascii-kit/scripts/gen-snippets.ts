// Writes snippets/core.json (Raycast → Import Snippets) from the glyphs that have a keyword.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_GLYPHS } from "../src/data/glyphs";

const snippets = ALL_GLYPHS.filter((g) => g.keyword).map((g) => ({
  name: `ASCII · ${g.name}`,
  text: g.text,
  keyword: g.keyword!,
}));

// Raycast expands as soon as a keyword is typed, so a keyword that is a prefix of another
// (e.g. !ra and !ra2) makes the longer one unreachable.
const problems: string[] = [];
for (const a of snippets) {
  for (const b of snippets) {
    if (a === b) continue;
    if (a.keyword === b.keyword) problems.push(`duplicate keyword ${a.keyword}`);
    else if (b.keyword.startsWith(a.keyword)) problems.push(`${a.keyword} is a prefix of ${b.keyword}`);
  }
}
if (problems.length) {
  console.error([...new Set(problems)].join("\n"));
  process.exit(1);
}

const out = resolve(__dirname, "../snippets/core.json");
writeFileSync(out, JSON.stringify(snippets, null, 2) + "\n");
console.log(`Wrote ${snippets.length} snippets to ${out}`);
for (const s of snippets) console.log(`  ${s.keyword.padEnd(6)} ${JSON.stringify(s.text)}`);
