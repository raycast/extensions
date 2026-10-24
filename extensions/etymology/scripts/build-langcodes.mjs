// Regenerates assets/langcodes.json: Wiktionary language code -> canonical name.
//
// Three modules, because Wiktionary splits the namespace. Full languages ("ang")
// live in one, etymology-only languages ("la-med", "xno") in another, and
// families ("gem", "ine") in a third. Derivation templates draw from all three,
// so a build that reads only the first leaves Medieval Latin and Anglo-Norman
// unnamed.
//
// Run by hand when Wiktionary adds codes; not part of `ray build`.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAW = (title) =>
  `https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;

// [title, direction] - "code" is already code -> name, "name" needs inverting.
const SOURCES = [
  ["Module:languages/code_to_canonical_name.json", "code"],
  ["Module:etymology_languages/canonical_names.json", "name"],
  ["Module:families/canonical_names.json", "name"],
];

const UA = "raycast-etymology-build/1.0 (bot; https://github.com/Chiarandini)";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "langcodes.json");

const merged = {};
for (const [title, direction] of SOURCES) {
  const res = await fetch(RAW(title), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${title}`);
  const data = await res.json();

  let added = 0;
  for (const [a, b] of Object.entries(data)) {
    const [code, name] = direction === "code" ? [a, b] : [b, a];
    // First writer wins: full languages outrank etymology languages outrank
    // families, and within a module Wiktionary's own ordering is canonical.
    if (!(code in merged)) {
      merged[code] = name;
      added++;
    }
  }
  console.log(`${title}: +${added}`);
}

const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(out, JSON.stringify(sorted) + "\n");
console.log(`${Object.keys(sorted).length} codes -> ${out}`);
