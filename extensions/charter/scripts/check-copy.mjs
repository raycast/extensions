// Fails when anything a user can see breaks the copy rules: no em or en dashes
// (plain punctuation only: commas, colons, full stops, brackets) and US
// spelling, which the Raycast store requires. Runs as part of npm run lint.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targets = ["src", "package.json", "README.md", "CHANGELOG.md"];
/** Third-party text pulled by a script; its spelling is not ours to fix. */
const skipped = new Set(["src/data/shadcn.ts"]);

const rules = [
  { name: "em or en dash", pattern: /[–—]/ },
  {
    name: "British spelling",
    pattern:
      /\b(favourite|colour|centre|recognis\w*|organis\w*|prioritis\w*|analys(e|ed|es|ing)|catalogue|modelling|labelled|licence|grey|behaviour|visualis\w*|customis\w*|optimis\w*|summaris\w*|initialis\w*|cancelled|travelled|programme|whilst|amongst)\w*\b/i,
  },
];

function* walk(path) {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats) return;
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) yield* walk(join(path, entry));
  } else {
    yield path;
  }
}

const offenders = [];
for (const target of targets) {
  for (const file of walk(join(root, target))) {
    if (skipped.has(relative(root, file))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const rule of rules) {
        const match = line.match(rule.pattern);
        if (match) offenders.push(`${relative(root, file)}:${index + 1}: ${rule.name} "${match[0]}"`);
      }
    });
  }
}

if (offenders.length > 0) {
  console.error("Copy rules broken:\n");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}
console.log("Copy rules hold: no dashes, US spelling.");
