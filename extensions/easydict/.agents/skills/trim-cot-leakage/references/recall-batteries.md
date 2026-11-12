# Recall Probes

Use these searches to find candidates for the [taxonomy](../SKILL.md#taxonomy). Choose probes relevant to the task and inspect every candidate in context. They are intentionally incomplete and may match valid prose, code, or runtime strings. Never use them as automatic rewrite rules or a zero-warning gate.

## Scope and invocation

Run from the repository root. Replace the example `scope` with the user-authorized files or directories. For a diff review, inspect the changed prose and enough surrounding context; a search hit elsewhere in the same file does not expand the requested scope.

This shell example works in the project's development environment; it is not extension runtime code. Keep exclusions after include globs, use `--hidden` for locally owned `.agents` files, and retain normal ignore rules. Add fixture or vendored paths if they occur in the chosen scope.

```zsh
scope=(README.md README_ZH.md docs/development src)
prose_globs=(
  --glob '*.md' --glob '*.ts' --glob '*.tsx'
  --glob '!.git/**' --glob '!node_modules/**' --glob '!dist/**'
  --glob '!vendor/**' --glob '!**/raycast-env.d.ts'
  --glob '!**/fixtures/**' --glob '!**/__fixtures__/**'
  --glob '!**/__snapshots__/**' --glob '!*.snap'
  --glob '!.agents/skills/raycast-extension/**'
  --glob '!.agents/skills/review-pr/**'
  --glob '!.agents/skills/dsh-trim-cot-leakage/**'
)

# Dead internal citations. Keep matching identifiers case-sensitive.
rg -n --hidden "${prose_globs[@]}" \
  '\(decision [0-9]|\(audit [A-Z][0-9]|design §|plan §|design ledger|\(B ruling|\bP-I\b|\b[WT][0-9]\b' "${scope[@]}"

# PR vantage and review narration.
rg -n --hidden -i "${prose_globs[@]}" \
  '\bthis PR\b|\bthis branch\b|\bthis stack\b|\blater PRs?\b|\bprevious commits?\b|rejected in review|review round|reviewer|as of v[0-9]' "${scope[@]}"

# Change narration and hedges: expect legitimate migration and lifecycle hits.
rg -n --hidden -i "${prose_globs[@]}" \
  '\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|this cut|\bfor now\b|probably |should be enough|should suffice' "${scope[@]}"

# Chinese narration, including this project's actual Chinese README path.
rg -n --hidden "${prose_globs[@]}" \
  '本次[[:space:]]*PR|本次提交|上一轮|评审认为|评审要求|决策[[:space:]]*[0-9]|设计稿|暂时够用|以前|旧版|不再' "${scope[@]}"
```

`rg` exits with status 1 when it finds no matches; that is not a tool failure. Search results inside TS/TSX can be runtime strings or test data rather than comments. Inspect the surrounding syntax before proposing edits. Respect `automd` block ownership even when a generated line matches.

Check a new or modified probe against an obvious positive and a near-miss when its behavior is uncertain. For example, `\bthis PR\b` should match “This PR adds caching” with `-i`, but not “this provider caches results.” Do not treat matching a phrase as a decision about whether to keep it.

## Language-specific inspection

Read English and Chinese prose in their own context. The Chinese README is `README_ZH.md`, not `*.zh.md`; other Chinese guides use Chinese filenames. Do not infer a document's language only from a filename suffix.

If investigating mixed-language residue, narrow the search to the relevant English prose or comments. A broad search for Chinese characters is especially noisy in this dictionary and translation extension. Prompt examples, test inputs, dictionary payloads, language names, and quoted user text intentionally contain multiple languages.

## Common false positives

- **Instrumental “used to”:** “The key is used to sign requests” describes purpose, not repository history.
- **Migration vocabulary:** “legacy,” “old settings,” “no longer,” and “不再” can explain current upgrade, import, or restoration behavior. Keep the conditions and reversibility precise.
- **Runtime lifecycle:** an old request and a new query may coexist; their relative age explains cancellation and stale-result guards.
- **Identifiers and versions:** `/v1/chat/completions`, persisted format versions, and supported OS versions are not draft stamps.
- **Process and history:** PR templates, review instructions, release notes, and decision records can legitimately discuss PRs and prior behavior.
- **Durable references:** issue or PR links, standards sections, and sections with maintained owners remain useful. Verify the actual target rather than deleting their citation syntax.
- **Quotes and data:** prompt text, multilingual examples, fixtures, recorded output, and this skill's examples may deliberately contain every suspect phrase.
- **Evidence and uncertainty:** measured values, observed limitations, and scoped TODOs must not become unqualified claims during trimming.

Also read substantial prose without a search pattern: opaque shorthand and reviewer-directed arguments need not contain any phrase above. Report remaining substantive uncertainty; do not keep expanding the battery until legitimate wording disappears.
