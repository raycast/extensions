# SkillOpt Prompt Contract Evaluation

Date: 2026-06-02

This is a contract-level before/after evaluation of first-tier Raycast and VS Code extensions that generate user-visible text or structured text/JSON. It does not claim to be a full SkillOpt training run. The scoring asks whether the production prompt explicitly covers five dimensions:

1. output/schema contract
2. source grounding or fidelity
3. no-invention boundary
4. task/layer boundary
5. user usefulness, speakability, renderability, or practice value

## Before / After

| Repository | Main generated output | Before | After | Change |
| --- | --- | ---: | ---: | --- |
| `raycast-ai-translate` | translation + Vision OCR text | 3 / 5 | 5 / 5 | Added explicit faithfulness, native-language, OCR, and translation-only gates. |
| `raycast-say-it-right` | natural-English expression + prosody JSON | 4 / 5 | 5 / 5 | Added/kept SkillOpt gates and clarified Expression Coach vs Pronunciation Coach UX. |
| `raycast-skill-manager` | skill recommendation JSON | 2 / 5 | 5 / 5 | Added exact catalog-name, relevance, diversity, and JSON gates. |
| `vscode-english-coach` | translation, rewrite, expression, feedback, prosody | 3 / 5 | 5 / 5 | Added gates for translation fidelity, expression anti-invention, transcript evidence, and prosody text fidelity. |
| `vscode-html-writer` | five-step academic rewrite JSON | 4 / 5 | 5 / 5 | Added a pipeline-wide SkillOpt gate for source-of-truth, traceability, step boundary, and edit usefulness. |
| `vscode-skill-curator` | skill diagnosis + overlap JSON | 3 / 5 | 5 / 5 | Added evidence, severity, budget, exact-key, precision, and schema gates. |
| `scholar-writing-assistant` | Style-RAG rewrite + Prompt Studio output | 3 / 5 | 5 / 5 | Added source-of-truth, fact/citation, material coverage, and output-usefulness gates. |
| `parlance` | RAG phrasing suggestions | 4 / 5 | 5 / 5 | Added explicit grounding, insufficiency, no-invention, and schema gates. |
| `english-speaking-training-vscode` | coach JSON, drills, material briefs, lesson packages | 4 / 5 | 5 / 5 | Added transcript/task evidence, strict JSON, render-critical, and practice-value gates. |

## Interpretation

The strongest pre-existing prompts already had good schema or grounding rules, especially HTML Writer, Parlance, Say It Right, and English Speaking Training. The rollout makes those constraints explicit as a final validation gate, so future prompt edits preserve the same mental model:

- treat model output as a candidate artifact;
- validate it against task-specific evidence and schema;
- prefer a narrower, grounded output over a plausible but invented one;
- keep product layers separate instead of letting translation, expression, pronunciation, and TTS style collapse into one fuzzy command.

## Live / Runtime Evidence

Verified on 2026-06-02:

- `raycast-ai-translate`: `npm test && npm run build && npm run lint` passed.
- `raycast-say-it-right`: `npm test && npm run typecheck && npm run build && npm run lint` passed after Prettier formatting `src/TranslateView.tsx`.
- `raycast-skill-manager`: `npm test && npm run build` passed.
- `vscode-english-coach`: `npm test && npm run check && npm run compile` passed.
- `vscode-html-writer`: `npm run check` passed.
- `vscode-skill-curator`: `npm test && npm run typecheck && npm run build` passed.
- `scholar-writing-assistant`: `npm test && npm run typecheck && npm run build` passed.
- `parlance`: `npm test && npm run typecheck && npm run build` passed.
- `english-speaking-training-vscode`: `npm test` passed.

Live evals:

- `vscode-html-writer`: `npm run eval:prompts` with Qwen Token Plan produced `.paper-html-writer/prompt-ab/prompt-ab-2026-06-02T00-28-35-569Z.json`. Optimized+guard beat current on both samples: mechanical-list 202 vs 142, citation-risk 202 vs 140, aggregate 404 vs 282, delta +122.
- `vscode-english-coach`: `INTENT_EVAL_PROVIDER=qwen INTENT_EVAL_API_KEY=$BAILIAN_TOKEN_PLAN_API_KEY npm run eval:intent-expression` produced `docs/evals/intent-expression-2026-05-31.md`. The current built-in prompt remained the selected winner: baseline 207 total / 34.50 average; candidate-a 204 / 34.00; candidate-b 204 / 34.00.
