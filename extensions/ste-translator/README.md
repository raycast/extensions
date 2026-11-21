# STE Translator (Raycast extension)

Rewrite English text as Simplified Technical English (STE), based on the writing principles of ASD-STE100. Works for emails, chat messages, technical documents, SOPs/runbooks and incident reports.

> **AI rewriting alone does not certify ASD-STE100 compliance.** This extension applies STE _principles_ through an AI model. It does not check text against the ASD-STE100 dictionary and it is not endorsed by the ASD-STE100 Maintenance Group. A qualified person must review any text where compliance or safety matters.

## Commands

| Command                           | What it does                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Convert Selected Text to STE**  | Reads the selection in the frontmost app and shows a review screen. If nothing is selected, it explains this and offers the clipboard workflow. |
| **Convert Clipboard Text to STE** | Reads the clipboard into an editable form. You review and edit the input, then convert.                                                         |
| **Convert Text to STE**           | Manual form: input text, content type, conversion mode.                                                                                         |

Review screen actions: **Copy Result**, **Paste Result to Frontmost App** (`⌘↵`), **Retry** (`⌘R`), **Retry with Minimal Changes**, **Copy Original Text**. The source text is never replaced unless you choose Paste.

Content types: Auto-detect, Email, Chat Message, Technical Document, SOP/Runbook, Incident Report.
Modes: Standard STE Rewrite, Minimal Changes, Strict Technical Review.

## How it protects technical content

Before text is sent to the AI provider, these items are replaced by placeholders (`[[P0]]`, `[[P1]]`, ...) and restored afterwards, so the model never edits them:

fenced code blocks, inline code, URLs, email addresses, IPv4/IPv6 addresses, UUIDs, AWS ARNs and common cloud resource IDs, file paths, CLI long flags, `ENV_STYLE` and `dotted.config.keys`, double-quoted strings (such as error messages) and numbers with units.

After conversion, the result is validated. The review screen shows warnings when:

- protected content is missing, duplicated, altered or replaced by an unresolved placeholder (error);
- the number of negations changed, or `if`/`unless` conditions disappeared;
- a free-standing number from the original is missing;
- the model flagged a term or change for human review.

If the provider fails, you see an error. The original text is never returned as if it had been converted.

## Writing rules and the STE check

The AI instructions follow the rule categories summarized in [danyuchn/asd-ste100-skill `writing-rules.md`](https://github.com/danyuchn/asd-ste100-skill/blob/master/references/writing-rules.md): approved-style word choice, allowed verb forms (no present or past perfect), active voice in procedures, one instruction per sentence, 20 words for instructions and 25 for descriptions, noun clusters of 3 words or fewer, no semicolons, no phrasal verbs, 6 sentences or fewer per paragraph, and lists for sequences. Hedges (may, might, suspected) are kept, because confidence is content.

`src/services/ste-lint.ts` is a TypeScript port of that project's `ste-lint.py`. It checks the rewrite for semicolons, phrasal verbs, marketing adjectives, nominalizations ("perform an analysis of"), sentences over 25 words, synonym rotation (check/verify/confirm), list items that end with "and" or "or", and, as advisories, passive voice and compound tenses. It lints the text with protected code and identifiers masked, so those are never judged as prose.

The lint drives a correction pass. If the first rewrite has hard violations or lost protected content, the extension sends the exact findings back to the model once, and keeps the corrected rewrite only if it scores better. Remaining findings appear as review warnings. The lint checks structure only. It has no ASD-STE100 dictionary and it cannot prove that the meaning is unchanged.

## Setup

Requirements: macOS, [Raycast](https://raycast.com), Node.js 22+ and npm. Raycast AI (the default provider) needs Raycast Pro.

```bash
npm install
npm run dev      # loads the extension into Raycast in development mode
```

Install permanently from source: run `npm run build`, then in Raycast use **Import Extension** and select this folder (or keep `npm run dev` running).

## Configuration (Raycast preferences)

| Preference                                     | Purpose                                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default Content Type / Default Conversion Mode | Used by _Convert Selected Text_ and as form defaults.                                                                                                |
| AI Provider                                    | `Raycast AI` (default) or `OpenAI-compatible endpoint`.                                                                                              |
| External Provider Base URL / Model / API Key   | For the OpenAI-compatible provider (calls `<base URL>/chat/completions`). The key is a Raycast password preference. It is never hardcoded or logged. |
| Custom Instructions                            | Extra rules (for example preferred terms). They cannot override the preservation rules.                                                              |
| Timeout (seconds)                              | Maximum wait for the provider. Default 60.                                                                                                           |

## Privacy

- Text you convert is sent to the configured AI provider (Raycast AI or your external endpoint) and leaves your machine. It is subject to that provider's data policy.
- The extension does not log input or output, and does not store history.
- The clipboard is read only when you run **Convert Clipboard Text to STE** or choose "Use Clipboard Text Instead". The clipboard and the source app change only when you press Copy or Paste.
- There is no backend, database or account.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ray lint (manifest, ESLint, Prettier)
npm run fix-lint    # auto-fix
npm test            # Vitest
npm run build       # ray build
```

Layout:

```
src/convert-selected.tsx, convert-clipboard.tsx, convert-text.tsx   # Raycast commands (entry files must live in src/)
src/components/   ConversionForm, ConversionResult, ClipboardConversion
src/services/     ste-transformer (prompts, pipeline, repair pass), ste-lint, ai-provider, text-protection, validation
src/types/        shared types
src/utils/        text helpers
tests/            Vitest tests; @raycast/api is mocked
```

The transformation pipeline is UI-free: `convertToSte(request, provider)` in `src/services/ste-transformer.ts`. Tests use a fake `AiProvider` and check that protected content survives, that dropped or altered content is flagged, and that errors and timeouts are reported rather than hidden.

## Examples

Outputs are illustrative. A real model output will vary, and you must review it.

**Email**

Input:

> Hi Sam, could you please take a look at the failing build when you get a chance? It seems that the cache was probably invalidated by the upgrade to `node 22`. Thanks, Alex

Output:

> Hi Sam,
> Please look at the failed build. The upgrade to `node 22` possibly made the cache invalid.
> Thanks,
> Alex
>
> Review: "possibly" keeps the author's uncertainty. Confirm the cause.

**Chat message**

Input: `hey, the deploy kinda broke prod, rolling back rn`
Output: `The deployment caused a fault in production. I am rolling it back now.`

**Technical document**

Input: `The service should be restarted if the memory usage is observed to exceed 85%.`
Output: `Restart the service if memory usage is more than 85%.`

**SOP / Runbook**

Input:

> Before the node is drained, it should be ensured that no jobs are running. Do not proceed if any are found. Then run `kubectl drain node-1 --ignore-daemonsets`.

Output:

> 1. Make sure that no jobs are in operation on the node.
> 2. If you find a job, do not continue.
> 3. Run `kubectl drain node-1 --ignore-daemonsets`.

**Incident report**

Input:

> At 02:14 UTC the database on 10.0.4.7 became unresponsive, which is suspected to have been caused by a disk that was full, and the on-call engineer was paged.

Output:

> At 02:14 UTC, the database on 10.0.4.7 stopped responding. A full disk is the suspected cause. The system paged the on-call engineer.
>
> Review: "the system paged" is an inferred actor. Confirm who or what sent the page.

## Limitations

- Not an ASD-STE100 compliance check. There is no approved-word dictionary and no certification.
- The AI can change meaning. The checks cover protected strings, negation counts, `if`/`unless` and numbers. They do not prove that meaning is preserved. Always read the result against the original, in particular for safety-critical text.
- Protection is pattern-based. Unusual identifiers, file paths with spaces and domain-specific tokens may not be detected. Wrap such items in backticks to protect them.
- The negation and number checks are heuristic and can raise false warnings.
- Input is limited to 20,000 characters.
- Raycast AI availability depends on your Raycast plan. UI components are not unit-tested; they need manual testing in Raycast.
