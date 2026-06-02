# Prompt Optimization Plan

This plan adapts the SkillOpt idea to Say It Right: treat each built-in prompt as a reusable skill artifact, improve it through scored rollouts, and accept prompt edits only when they beat the current prompt on held-out cases.

## Prompt Artifacts

- `src/llm/translate.ts`: Expression Coach skill. Converts rough intent into natural English and returns a short coaching note.
- `src/llm/prompt.ts`: Pronunciation Coach skill. Produces strict JSON for stress, rhythm, IPA, thought groups, and one actionable practice note.

## Evaluation Sets

- `train`: real failure cases from development and user reports, grouped by intent-expression, register choice, deadlines, politeness, and calque avoidance.
- `val`: stable held-out cases used as the validation gate before accepting prompt edits.
- `test`: release-only cases covering provider variance, long inputs, malformed model output, single-word examples, and paste-ready English.

Each item should include the source text, expected target behavior, forbidden additions, preferred tone, and a small scoring rubric.

## Scoring Rubric

- Fidelity: preserves intent, deadline, names, numbers, responsibilities, and constraints.
- Naturalness: sounds like idiomatic English rather than source-language syntax.
- No unsupported additions: no invented apologies, excuses, relationships, alternatives, or promises.
- Speakability: short enough to read aloud naturally and useful for shadowing.
- Coaching usefulness: explains concrete wording, register, rhythm, or calque-avoidance choices.
- Schema reliability: returns the required JSON shape when the command expects structured output.

## Optimization Loop

1. Collect rollout traces: prompt version, provider, model, source text, raw model output, parsed output, and failure label.
2. Propose bounded prompt edits: small add/delete/replace patches to one prompt artifact at a time.
3. Run train cases for diagnosis, then run the candidate on the validation set.
4. Accept only candidates that improve the validation score without increasing schema or parsing failures.
5. Keep rejected edits with their failure labels so the same prompt patch is not retried blindly.
6. Promote the accepted prompt as the current best prompt and run the release test set before shipping.

## Release Gates

- Unit tests pass for prompt content, parser fallback, rendering, and manifest UX.
- Prompt evals show no regression on the validation set.
- At least one domestic-first provider and one international provider are smoke-tested when relevant keys are configured.
- README and changelog describe user-visible changes without exposing prompt internals as user instructions.

## Next Implementation Step

Add `docs/evals/expression-coach-cases.json` and `scripts/expression-coach-eval.mjs` so future prompt changes can be scored the same way every time.
