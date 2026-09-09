// Generates src/api/schema.d.ts from the committed snapshot, components only.
// Emptying `paths` drops every inline request/response shape (28k lines -> ~2k);
// those are hand-written in src/api/types.ts (spec §4.2). All $refs in the spec
// point at #/components/..., so nothing dangles (verified in spec §4.1).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const spec = JSON.parse(readFileSync("scripts/attio-openapi.json", "utf8"));
spec.paths = {};
writeFileSync("scripts/.attio-components.tmp.json", JSON.stringify(spec));
execSync("npx openapi-typescript scripts/.attio-components.tmp.json -o src/api/schema.d.ts", { stdio: "inherit" });
rmSync("scripts/.attio-components.tmp.json");

// Guard: the output-value union must still be a discriminated union with all
// its variants. 19 today; if Attio adds one this number changes on purpose.
const out = readFileSync("src/api/schema.d.ts", "utf8");
const variants = out.match(/attribute_type: "/g)?.length ?? 0;
if (variants < 19) throw new Error(`output-value union looks pruned: ${variants} discriminants`);
console.log("schema.d.ts generated;", variants, "attribute_type discriminants");
