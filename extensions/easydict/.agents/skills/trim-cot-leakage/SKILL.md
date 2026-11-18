---
name: trim-cot-leakage
description: Audit or trim authoring-session residue in repository comments, JSDoc, and documentation, including dead decision IDs, PR or review narration, and unsupported planning claims. Use for prose cleanup, not runtime model-output filtering.
---

# Trim Authoring-Session Residue

Make maintained prose understandable from the repository and durable references, without the conversation that produced it. Here, “chain-of-thought leakage” means authoring-session residue in repository prose. It does not mean extracting private reasoning or filtering Easydict's translations and model responses.

## The decision test

Could a maintainer at the reviewed revision resolve the references and understand the behavior, conditions, and rationale without the authoring session? Use the working tree when reviewing uncommitted changes. Replace session-only context with verifiable facts; remove passages that add no useful information. On current-state surfaces, describe current behavior, while preserving history that explains an active compatibility or migration requirement.

Before trimming a passage, identify its factual claims, conditions, obligations, uncertainty, and evidence sources. Preserve each useful proposition, even when it shares a sentence with narration. Do not turn a hypothesis into a shipped feature, a migration obligation into an endorsement, or an observation into a guarantee. If the facts cannot be established, report the uncertainty instead of inventing a cleaner explanation.

## Taxonomy

1. **Dead session citations:** `(decision 7)`, `(audit C2)`, an uncommitted `design §4.7`, or unexplained plan-phase labels. Link a durable owner if one exists; otherwise remove the citation while preserving its supported factual clauses.
2. **Stack and PR vantage:** “this PR adds,” “the previous commit,” or “a later PR in this stack” in maintained prose. State the current mechanism. Retain genuine deferred work as a scoped TODO or existing issue without inventing an owner or promise.
3. **Change narration:** “used to,” “now,” “this cut,” or “the old implementation” when they only narrate repository edits. State the mechanism or a useful counterfactual failure condition. Keep actual protocol versions, runtime transitions, migration instructions, and release history.
4. **Review choreography:** reviewer attribution, review rounds, or draft ordinals. Keep the resulting decision and rationale. Alternatives considered and postmortem evidence can remain in documents intended to record them.
5. **Reviewer-addressed justification:** “the cast is safe; it simply…” or “this is correct because the reviewer confirmed…”. State the invariant that makes the operation valid, or delete the comment if it merely repeats obvious code.
6. **Control-flow and derivation transcripts:** comments that walk through immediately visible statements or test steps. Keep explanations of non-obvious ordering, race conditions, boundaries, and regression scenarios.
7. **Unsupported hedges and planning residue:** “probably fine for now” or “should be enough.” State an evidenced bound, retain real uncertainty, or record a concrete known follow-up. Do not invent measurements or future work to justify removing a hedge.
8. **Authoring-language slips:** accidental working-language fragments in otherwise consistent prose. Match the maintained document's language; preserve intentional multilingual examples, translated content, identifiers, and quoted evidence.

Use [examples and overcorrection traps](references/examples.md) when classification or preservation of a factual clause is unclear.

## Easydict boundaries

- **Maintained prose:** comments and JSDoc in source and tests, `README.md`, `README_ZH.md`, development guides, `AGENTS.md`, and locally owned skill instructions. Apply the requested scope, not a repository-wide cleanup by default.
- **Behavioral content:** translation prompts in `src/providers/translation/ai/prompt.ts`, dictionary prompts in `src/providers/dictionary/ai/prompt.ts`, UI strings, manifest descriptions, provider payloads, fixtures, snapshots, and test inputs are not ordinary comments. Leave them out of prose-only cleanup. If the user also requests changes to those surfaces, trace their consumers and verify the relevant behavior separately.
- **Generated and external content:** do not hand-edit `raycast-env.d.ts`, build output, dependencies, vendored code, or synchronized third-party skills. For prose inside `<!-- automd -->` blocks, inspect `automd.config.ts` and its data sources, change the authorized owner, and run `npm run docs:gen`. Do not broaden a prose task into a provider-data change.
- **English and Chinese docs:** preserve corresponding maintained facts in `README.md` and `README_ZH.md`, and in paired guides when applicable. Update only the affected counterpart; do not impose byte-identical prose or code-comment translations. Generated localized blocks still follow their generator.
- **History and compatibility:** `CHANGELOG.md`, `RELEASE_MARKDOWN` in `src/consts.ts`, migration guidance, and genuine decision records may describe old and new behavior. Preserve versions, `{PR_MERGE_DATE}`, restoration or retry conditions, and data-preservation guarantees. A prose-only trim does not require a release or changelog entry.
- **Durable evidence:** keep useful issue and PR links, standards references, resolvable document sections, scoped TODOs, measurements with their qualifiers, and non-obvious regression explanations. Preserve copyright notices and reasons for suppressions or intentionally ignored errors; correct unsupported reasons rather than erasing them.

## Workflow

1. Establish scope from the user's paths, branch or PR target, or current changes. Inspect staged, unstaged, and relevant untracked work when reviewing the working tree. If no scope can be inferred, ask one focused question; do not default to scanning everything. Read the applicable [project instructions](../../../AGENTS.md) and preserve unrelated edits.
2. Inspect candidates before editing. For a broad scope, use selected [recall probes](references/recall-batteries.md) plus a direct read of substantial prose; a search hit is only a lead. Verify the owning implementation or durable reference for factual rewrites. A zero-hit search does not establish that the prose is clean.
3. For an audit request, report actionable findings with locations and proposed wording. When cleanup is already authorized, make the edits directly after inspection; no separate approval round is required. Keep executable code, identifiers, runtime strings, and historical records outside the prose task's scope.
4. Fix the owner, preserve factual clauses and qualifications, and update affected generated or bilingual counterparts as described above. Explain a real behavior or documentation mismatch separately rather than silently changing implementation to match the revised prose.
5. Review the final diff for lost facts, broken references, changed examples, and scope growth. Check Markdown formatting, local links, and `git diff --check`. Comment-only source edits still follow the repository's code-file checks: `npm run lint`, `npm test`, and `npm run build`. Documentation-only edits do not need those code checks; report them as skipped. Regenerate docs only when their inputs changed.

Report the scope, meaningful edits or findings, any unresolved claims, and the checks performed. No findings is a valid outcome; do not manufacture wording changes to satisfy a quota.
