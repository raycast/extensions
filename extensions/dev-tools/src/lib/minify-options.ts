// Minify settings shared by all minifiers. As with FormatOptions, every option
// lives in one flat object and `MINIFY_FIELDS` declares the per-language subset.
// JS-flavoured options (mangle/compress/drop*) are reused by the HTML minifier
// for its inline <script> handling. Non-minifiable languages map to an empty
// list and never reach a minify command.

import type { Language } from "./languages";

export type CssLevel = 1 | 2;

export interface MinifyOptions {
  /** Rename local identifiers (terser mangle / inline-JS mangle). */
  mangle: boolean;
  /** Dead-code elimination and expression shortening (terser compress). */
  compress: boolean;
  dropConsole: boolean;
  dropDebugger: boolean;
  removeComments: boolean;
  /** clean-css optimization level (1 = safe, 2 = structural merges). */
  cssLevel: CssLevel;
  htmlCollapseWhitespace: boolean;
  htmlRemoveOptionalTags: boolean;
  htmlRemoveRedundantAttributes: boolean;
  htmlMinifyInlineCss: boolean;
  htmlMinifyInlineJs: boolean;
}

export const DEFAULT_MINIFY_OPTIONS: MinifyOptions = {
  mangle: true,
  compress: true,
  dropConsole: false,
  dropDebugger: true,
  removeComments: true,
  cssLevel: 2,
  htmlCollapseWhitespace: true,
  htmlRemoveOptionalTags: false,
  htmlRemoveRedundantAttributes: true,
  htmlMinifyInlineCss: true,
  htmlMinifyInlineJs: true,
};

export const MINIFY_FIELDS: Record<Language, (keyof MinifyOptions)[]> = {
  javascript: ["mangle", "compress", "dropConsole", "dropDebugger", "removeComments"],
  typescript: ["mangle", "compress", "dropConsole", "dropDebugger", "removeComments"],
  css: ["cssLevel", "removeComments"],
  html: [
    "htmlCollapseWhitespace",
    "removeComments",
    "htmlRemoveOptionalTags",
    "htmlRemoveRedundantAttributes",
    "htmlMinifyInlineCss",
    "htmlMinifyInlineJs",
    "mangle",
    "dropConsole",
    "cssLevel",
  ],
  xml: ["removeComments"],
  sql: ["removeComments"],
  // Not minifiable — no minify command renders these.
  scss: [],
  less: [],
  markdown: [],
  yaml: [],
};
