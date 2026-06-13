# Repository Development Guide

This file defines the durable engineering rules for contributors and coding
agents working in this repository.

## Project Purpose

JSON Toolkit is a Raycast-native extension for:

- Formatting valid JSON
- Conservatively formatting invalid or relaxed JSON-like text
- Formatting JSON fragments embedded in logs
- Escaping complete text values as JSON strings
- Unescaping exactly one JSON string layer

All primary workflows must remain inside Raycast. Do not introduce required web
pages, terminal commands, network services, or external applications at
runtime.

## Product Contract

Preserve these behaviors unless an explicitly reviewed product change modifies
them:

1. The extension exposes five commands:
   - `Format JSON`
   - `Format JSON from Selected Text`
   - `Format JSON from Clipboard`
   - `Escape JSON String`
   - `Unescape JSON String`
2. Input sources are explicit. Never silently fall back from selected text to
   clipboard content or from clipboard content to another source.
3. Formatting attempts strict `JSON.parse` before best-effort formatting.
4. Any valid JSON root is accepted, including primitives and `null`.
5. Stringified JSON remains a string during formatting.
6. Invalid input uses a text-only best-effort result with a concise notice.
7. Best-effort formatting must preserve surrounding text and token spelling.
8. Do not invent missing quotes, commas, or delimiters.
9. Do not remove comments or convert relaxed syntax into standard JSON.
10. Unescape decodes exactly one layer and requires a JSON string root.
11. The unescape result may be sent into the standard format pipeline.
12. Inputs larger than 5 MB in UTF-8 are rejected before parsing or rendering.
13. v0 has no tree viewer, custom document search, editing, or JSON diff.

## Architecture

### Command Entry Points

Files in `src/*.tsx` map directly to Raycast commands declared in
`package.json`. Keep them small:

- Capture the requested input source once.
- Pass data into a shared command component.
- Do not duplicate parsing or formatting logic.

Selected text and clipboard values must be captured once at command startup.
Avoid delayed or repeated reads during React effects or re-renders because the
frontmost application context may have changed.

### Components

`src/components` owns Raycast UI:

- Forms
- Loading and error states
- Result details
- Action panels
- Navigation between results

Components may orchestrate pure functions but should not contain lexical parsing
or serialization algorithms.

Use Raycast-native components. Do not assume browser DOM, CSS, arbitrary HTML,
or unsupported Markdown extensions. Raycast may display unsupported HTML tags
literally.

### Domain Logic

`src/lib` owns framework-independent behavior:

- `format-json.ts`: strict parsing and result classification
- `best-effort-format.ts`: relaxed-text scanning and formatting
- `json-string.ts`: escape and single-layer unescape
- `input.ts`: source validation and UTF-8 size limits
- `markdown.ts`: safe fenced code blocks and result Markdown
- `errors.ts`: user-facing error normalization

Prefer pure functions. Keep Raycast API imports out of `src/lib`.

## Best-Effort Formatter Rules

The fallback formatter is intentionally conservative:

- Scan strings, escapes, line comments, block comments, and balanced
  object/array delimiters.
- Format safely balanced JSON-like spans in their original positions.
- Preserve text before, between, and after spans exactly.
- Preserve single quotes, unquoted keys, comments, and trailing commas.
- Leave ambiguous or unbalanced regions unchanged.
- Keep the algorithm linear or near-linear for inputs up to 5 MB.

Add a regression test before changing scanner state transitions. Include cases
with delimiters inside strings and comments, mismatched delimiters, nested
containers, multiple spans, and large malformed input.

## Result and Action Rules

- Valid JSON displays pretty JSON in a fenced `json` code block.
- Invalid input displays a concise notice followed by a fenced `text` block.
- The invalid notice is UI-only and must not be included in copied output.
- Dynamic Markdown fences must be longer than any backtick run in the content.
- `Command-C` copies the primary complete result.
- Valid JSON also exposes `Copy Minified JSON`.
- Unescaped text exposes `Format Unescaped Text`.

Do not add node-level actions while the result is text-only.

## TypeScript and React

- Use strict TypeScript.
- Avoid `any`; model external or parsed values as `unknown`.
- Prefer discriminated unions for result and state types.
- Keep state transitions explicit.
- Use stable values for one-time system reads.
- Await user-visible async actions where practical.
- Keep comments rare and focused on non-obvious correctness constraints.

Follow the existing Prettier and Raycast ESLint configuration. Do not add a new
formatting or linting tool without a clear repository-wide need.

## Testing Requirements

Every behavior change must include or update tests.

Tests live under `tests` and use Vitest. Focus tests on observable contracts:

- Valid, primitive, and stringified JSON
- Invalid and relaxed JSON
- Embedded and multiple JSON-like spans
- Preservation of unsupported or malformed content
- JSON string escaping and one-layer unescaping
- Markdown fence safety
- UTF-8 byte limits
- Large fixtures and pathological scanner inputs

Large fixtures must be generated deterministically rather than committed as
multi-megabyte blobs.

Run:

```bash
make test
make typecheck
make lint
make build
```

Use `make check` for the complete automated verification sequence.

`ray lint`, `ray build`, and `ray develop` may access Raycast services or write
to `~/.config/raycast`. Request the necessary approval rather than bypassing the
official tools.

## Manual Verification

Before considering a release complete, verify inside Raycast:

1. Manual formatting of valid and invalid input
2. Selected-text formatting from a different frontmost application
3. Clipboard formatting
4. Pretty, minified, and fallback copy actions
5. Escape and unescape behavior
6. `Format Unescaped Text`
7. Empty or unavailable input errors
8. Exactly 5 MB and over-limit behavior

Do not claim manual verification without actually performing the corresponding
Raycast interaction.

## Change Management

- Open or reference an issue for substantial user-visible or architectural
  changes.
- Record important decisions and trade-offs in the issue or pull request.
- Keep implementation, tests, documentation, and command metadata synchronized.
- Update README and this guide when product behavior or contributor workflow
  changes.
- Small internal refactors that preserve behavior do not require an issue.
- New commands, changed input semantics, new limits, or altered fallback
  behavior require explicit maintainer review.

## Dependency Policy

- Use npm and commit `package-lock.json`.
- Keep `@raycast/api` current enough for the supported Raycast runtime.
- Keep peer type versions compatible with the Raycast SDK.
- Avoid unnecessary runtime dependencies.
- Prefer standard library or small pure implementations for core formatting
  logic.
- Review `npm audit` findings, but do not blindly apply downgrade or
  force-update suggestions that conflict with the Raycast toolchain.

## Git and Pull Requests

- Keep commits focused and use imperative commit messages.
- Do not commit `node_modules`, `dist`, coverage output, or local Raycast data.
- Do not rewrite unrelated user changes.
- Pull requests should describe:
  - User-visible behavior
  - Important implementation decisions
  - Automated checks run
  - Manual Raycast verification performed
  - Remaining risks or limitations

## Release Checklist

Agents and contributors prepare releases but MUST NOT publish the extension.

1. Run `make check`.
2. Complete all manual verification items.
3. Review command titles, descriptions, icon, and README.
4. Report the repository as ready for maintainer review.

Never publish solely because the code compiles; the input-source and clipboard
flows require real Raycast verification.

Publishing is performed only by the project maintainer. Do not add a publish
target, npm script, CI job, automation, or agent instruction that can submit the
extension to the Raycast Store.
