# Roadmap

This roadmap is directional. Preserve current behavior while shipping changes incrementally.

## Current: v1.2.0 — Reliability and Store readiness

Completed:

- Natural, Punchy, Short, and Reply modes
- Setup check
- Clipboard-first output
- Explicit proxy support
- Local draft protection before network requests
- Recent draft history
- Retry flow
- Error categories
- 50-record limit
- 30-day cleanup
- Five-minute deduplication
- Successful retry updates the original record
- Per-record v2 history storage with backward-compatible v1 migration
- Automated tests for concurrency, cleanup, deduplication, retry updates, malformed records, and record limits
- Credential-free proxy diagnostics and no machine-specific proxy default
- US English Store-facing UI and bilingual documentation
- Public privacy disclosure for Gemini API data handling

Before Store submission:

- Capture at least three Raycast Store screenshots with Window Capture.
- Make the GitHub repository public.
- Run the final `npm run publish` flow and address reviewer feedback.

## v1.3 — Prompt quality

Goal: move from translation toward native rewriting for X.

Candidate work:

- Improve the Natural mode for idiomatic English.
- Add stronger sentence restructuring where literal translation sounds unnatural.
- Preserve uncertainty, tone, and factual boundaries.
- Reduce generic AI phrasing.
- Build a small prompt evaluation set with expected characteristics.
- Add configurable output preferences only when they improve the keyboard-first workflow.

Example target transformation:

```text
今天越来越觉得 AI 产品真正竞争的是工作流。
```

Possible native rewrite:

```text
AI products are increasingly competing on workflow, not just models.
```

The model must not invent extra claims merely to make a post more dramatic.

## v1.4 — More writing modes

Potential modes:

- Founder
- Fast Take
- Conversational
- Minimal
- Technical
- Quote Reply

Any new command should have:

- a clear use case,
- a stable prompt contract,
- a sensible alias,
- reuse of the shared rewrite pipeline,
- history support.

Avoid naming a mode after a living writer as a direct style imitation. Describe the desired traits instead.

## v2.0 — Thread generation

Goal: turn one Chinese idea into a coherent short thread.

Potential capabilities:

- generate a configurable number of posts,
- maintain one argument across the thread,
- respect X length constraints,
- copy the complete thread,
- copy one post at a time,
- save and retry thread drafts locally,
- avoid repetitive hooks and conclusions.

This should be implemented as a separate command rather than silently changing existing single-post modes.

## Future exploration

- LinkedIn mode
- Reddit mode
- Hacker News mode
- GitHub release notes
- Product Hunt launch copy
- Shared core under a broader WriteCraft name

These are not commitments. Validate the X workflow before broadening the product.
