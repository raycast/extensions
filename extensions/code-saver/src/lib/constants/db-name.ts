export const DB_NAME = "code-saver.db";
export const X64_BINDING = "better-sqlite3-v8.7.0.x86.node";
export const ARM_BINDING = "better-sqlite3-v8.7.0.arm.node";
export const MIGRATIONS_FOLDER = "drizzle";

// tldr style can be found: https://github.com/tldr-pages/tldr/blob/main/contributing-guides/style-guide.md
// it will be checked with https://github.com/tldr-pages/tldr-lint
// freestyle means it can be
// 1. code
// 2. markdown doc
// we will check the filename of it to see whether there is one extension name for it
// then render it as regarding code block
// otherwise it will be rendered as pure markdown doc
export const SnippetMarkdownFormatTypeEnumArray = ["tldr", "freestyle"] as const;
export type SnippetMarkdownFormatType = (typeof SnippetMarkdownFormatTypeEnumArray)[number];
