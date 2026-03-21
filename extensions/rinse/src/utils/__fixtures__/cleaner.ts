// Realistic inputs used for snapshot testing.
// Add a new export here, then a matching it() in cleaner.test.ts.

// ─── Terminal output ───────────────────────────────────────────────────────────

export const npmInstallOutput = [
  "\x1b[2K\x1b[1G⠙ Installing packages...",
  "│ added 42 packages in 3s               │",
  "├──────────────────────────────────────────┤",
  "│ 3 packages are looking for funding       │",
  "└──────────────────────────────────────────┘",
  "",
  "\x1b[32mfound 0 vulnerabilities\x1b[0m",
].join("\n");

// ─── Claude responses ──────────────────────────────────────────────────────────
// What people copy from Claude to paste into Slack, notes, Jira, Confluence,
// PR descriptions, AI prompts, etc.

// Soft-wrapped prose + decorative separator → paste to Slack or notes
export const claudeProseExplanation = [
  "The core issue is that the component is doing two things at once: fetching",
  "data and rendering it. This makes it harder to test and reason about.",
  "",
  "---",
  "",
  "Extract the data-fetching into a custom hook instead.",
].join("\n");

// Numbered steps with wrapped continuations → paste to Jira or Confluence
export const claudeStepByStep = [
  "Here is how to migrate. Each step is independent so you can split across",
  "PRs if needed.",
  "",
  "1. Move fixture strings into a dedicated module. This keeps the test file",
  "   focused on assertions rather than string data.",
  "",
  "2. Replace toBe assertions with toMatchSnapshot. The first run writes the",
  "   snapshots; subsequent runs catch regressions.",
].join("\n");

// Indented example block + wrapped prose → paste to PR description or code comment
export const claudeCodeExplanation = [
  "The join pass runs after the decoration pass so that --- lines still act as",
  "paragraph boundaries when the joiner inspects them.",
  "",
  "  First sentence.",
  "  ---",
  "  Second sentence.",
  "",
  "Reversing the order would cause the joiner to merge the sentences.",
].join("\n");

// Box-drawing panel header + bullet list → paste to notes or AI prompt
export const claudeTerminalResponse = [
  "╭─────────────────────────────────────────────────────────────────────────────╮",
  "│  Summary                                                                    │",
  "╰─────────────────────────────────────────────────────────────────────────────╯",
  "",
  "Vitest is a good fit here. Its built-in TypeScript support means zero",
  "additional config for a pure utility file like cleaner.ts.",
  "",
  "- Node test runner: requires ts-node or --experimental-strip-types.",
  "- Jest: heavier setup, not worth it for a project this size.",
].join("\n");

// Markdown response with ## header, inline backticks, and a fenced code block.
// NOTE: the joiner has no fence awareness — lines inside ``` blocks are not
// indented, so they will be joined. The snapshot documents current behavior.
export const claudeWithMarkdown = [
  "## Why this works",
  "",
  "The `SENTENCE_END_RE` regex matches `.`, `?`, `!`, and `:` at the end of a",
  "line, preventing the joiner from merging sentences across those boundaries.",
  "",
  "```typescript",
  'const cleaned = text.replace(ANSI_ESCAPE_RE, "");',
  "const result = cleaned.trim();",
  "```",
  "",
  "Paste this wherever you need it.",
].join("\n");

// Real Claude response copied from a terminal — fixed-width column padding.
// Tests: trailing spaces stripped, all-whitespace lines removed as decoration,
// indented list items and code commands preserved and not joined.
export const claudeBuildError = [
  "The build failed for two reasons:".padEnd(79),
  " ".repeat(79),
  "  - The TypeScript compiler rejected the import because the".padEnd(79),
  "    module path was wrong".padEnd(79),
  "  - The test runner timed out because the mock server was".padEnd(79),
  "    not started before the suite ran".padEnd(79),
  " ".repeat(79),
  "  Fix with:".padEnd(79),
  " ".repeat(79),
  "      npm run build -- --skipLibCheck".padEnd(79),
  "      npm test -- --timeout 10000\\",
].join("\n");
