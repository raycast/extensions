#!/bin/zsh
# Reclassify every installed skill into a categories.json.
# Run after installing enough new skills that fallback guesses pile up.
# Usage: regenerate-categories.sh [extra-dirs] [out-file]
#   extra-dirs: same comma-separated paths as the extension preference, so
#   project-source skills get classified too.
#   out-file: where to write the mapping. Defaults to categories.local.json
#   in the repo root (gitignored — the output includes YOUR personal skill
#   names, so it must never land in the bundled assets/categories.json that
#   ships to the store). Copy or point out-file to the extension's support
#   directory ("Open Categories Folder" action in the extension) to activate it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
EXTRA_DIRS="${1:-}"
OUT="${2:-$ROOT/categories.local.json}"

cd "$ROOT"
EXTRA_DIRS="$EXTRA_DIRS" TMP="$TMP" npx -y tsx -e "
import { loadSkills } from './src/skills';
import { writeFileSync } from 'fs';
loadSkills(process.env.EXTRA_DIRS || undefined).then(({ skills, warnings }) => {
  if (warnings.length > 0) {
    console.error('scan warnings — fix these before regenerating, or the affected skills drop out of the mapping:');
    warnings.forEach(w => console.error('  ' + w));
    process.exit(1);
  }
  const index = skills.map(k => ({ name: k.name, description: k.description.slice(0, 300) }));
  writeFileSync(process.env.TMP + '/skill-index.json', JSON.stringify(index, null, 1));
  console.log('indexed', index.length, 'skills');
});
"

cd "$TMP"
codex exec -m gpt-5.6-sol -c model_reasoning_effort=xhigh -c service_tier=priority \
  -s workspace-write --skip-git-repo-check -c 'mcp_servers={}' \
  "Read skill-index.json in this directory (agent skills, each with name and description). Classify EVERY skill into categories from this exact taxonomy (no other category names allowed):
Design, Animation & Motion, Engineering, iOS & macOS, Marketing & SEO, Copywriting, QA & Review, Deploy & Infra, Workflow & Process, AI & Memory.

Rules:
- Each skill gets 1-3 categories as a JSON array of unique strings, ordered most-relevant first (first = primary, used for grouping).
- Classify by what the skill DOES per its description, not by name vibes. Process gates like plan-design-review belong to Workflow & Process + QA & Review, not Design.
- QA & Review = testing, auditing, reviewing code/designs. Workflow & Process = planning, session management, git/commit conventions, orchestration, kickoff/routing.
- Every skill in the index MUST appear in the output.

Write the result to categories.json in this directory as a JSON object mapping skill name to an array of category strings. Then print a count per category (primary only)."

python3 - "$TMP/categories.json" "$TMP/skill-index.json" <<'EOF'
import json, sys
cats = json.load(open(sys.argv[1]))
idx = {s["name"] for s in json.load(open(sys.argv[2]))}
TAX = {"Design","Animation & Motion","Engineering","iOS & macOS","Marketing & SEO","Copywriting","QA & Review","Deploy & Infra","Workflow & Process","AI & Memory"}
missing = idx - set(cats)
bad = {
    k: v for k, v in cats.items()
    if not isinstance(v, list) or not v or len(v) > 3
    or not all(isinstance(c, str) and c in TAX for c in v)
    or len(set(v)) != len(v)
}
if missing or bad:
    sys.exit(f"validation failed — missing: {sorted(missing)[:10]} invalid: {list(bad)[:10]}")
print(f"validated {len(cats)} entries")
EOF

cp "$TMP/categories.json" "$OUT"
echo "wrote $OUT"
echo "activate it by copying to the extension's support directory (Open Categories Folder action), then reopen the command"
