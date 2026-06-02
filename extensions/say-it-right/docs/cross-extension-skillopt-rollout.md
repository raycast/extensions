# Cross-Extension SkillOpt Prompt Rollout

Date: 2026-06-02

SkillOpt-inspired principle: treat each built-in system prompt as a compact skill artifact for a frozen agent. Instead of relying on a single larger instruction, every text-generation prompt now carries a bounded validation gate that checks the candidate output against the task contract before the model returns it.

## First-Tier Scope

| Surface | Repository | Prompt role | Gate focus |
| --- | --- | --- | --- |
| Raycast | `raycast-ai-translate` | translation and Vision OCR | faithfulness, native target-language wording, OCR boundary, translation-only output |
| Raycast | `raycast-say-it-right` | expression coach and pronunciation coach | meaning fidelity, anti-invention, speakability, coaching usefulness, JSON schema |
| Raycast | `raycast-skill-manager` | skill recommendations | exact catalog names, relevance, duplicate avoidance, JSON array |
| VS Code | `vscode-english-coach` | translation, expression, rewrite, prosody, pronunciation feedback | expression/pronunciation separation, transcript evidence, schema |
| VS Code | `vscode-html-writer` | five-step paper rewrite pipeline | source of truth, quote/claim traceability, step boundary, no invention |
| VS Code | `vscode-skill-curator` | skill diagnosis and overlap analysis | evidence grounding, severity calibration, budget dimension, exact skill keys |
| VS Code | `scholar-writing-assistant` | Style-RAG rewrite and Prompt Studio generation | source of truth, fact/citation boundary, user material coverage, output usefulness |
| VS Code | `parlance` | RAG-based phrasing suggestions | passage grounding, insufficiency disclosure, no invented source/fact |
| VS Code | `english-speaking-training-vscode` | speaking coach, drill writer, lesson-package generator | transcript/task evidence, strict JSON, render-critical fields, practice value |

## Second-Tier Audio Prompt Scope

The scan also found audio-first prompt surfaces in `raycast-ai-voice-studio`, `raycast-mimo-tts`, `raycast-minimax-tts`, `raycast-gemini-tts`, `raycast-doubao-tts`, and `VSCode-ai-voice-studio`. These prompts control reading style, voice design, clone prompt text, director notes, or TTS request structure. They are not first-tier text-generation prompts because they do not produce user-facing written output, but they should get a later audio-specific SkillOpt pass focused on speech fidelity, style controllability, and provider request validity.

## Product Division

AI Translate owns translation, OCR, captured UI text, target-language reading, provider comparison, and copy/paste workflows.

Say It Right owns natural English expression and speech practice:

- Expression Coach: say selection, clipboard, or typed intent in natural English, with a short why-this-works note.
- Pronunciation Coach: analyze English text for stress, rhythm, IPA, thought groups, and intonation.
- Practice & Voice: model audio, slow playback, shadowing loop, save audio, voice/model switching.
- Practice Translation: comprehension aid inside the practice view only, not the rewrite surface.

## Evaluation Matrix

| Eval layer | Purpose | Evidence |
| --- | --- | --- |
| Prompt-contract tests | Gate text reaches the actual prompt sent to the model | unit tests in each repo |
| Existing live evals | Compare model output before/after where a corpus harness already exists | `vscode-html-writer` prompt A/B eval; `vscode-english-coach` intent-expression eval |
| Deterministic before/after report | Compare prompt coverage by contract dimension across all first-tier repos | `docs/evals/skillopt-prompt-contract-2026-06-02.md` |
| Release smoke | Ensure package build/test still passes after prompt changes | repo test/build scripts |

## Next Optimization Plan

1. Expand live corpora for Raycast prompt surfaces: translation/OCR edge cases, expression-coach politeness/deadline cases, and skill-recommendation ambiguity cases.
2. Add a shared prompt-contract checklist package or script so new extensions inherit the same gate taxonomy without copy-pasting long prompt text.
3. Adopt SkillOpt-style held-out validation for high-risk writing prompts: keep accepted prompt edits only when they improve JSON validity, faithfulness, and usefulness on a hidden fixture set.
4. Keep rejected prompt edits in per-repo eval reports so future prompt changes learn from failed variants instead of repeating them.
5. Treat pure TTS/audio style prompts as a second-tier rollout: optimize only where the prompt changes user-visible speech, not where the extension is a simple TTS transport.
