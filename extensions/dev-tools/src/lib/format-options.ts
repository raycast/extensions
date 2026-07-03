// Format settings shared by all formatters. Every option lives in one flat
// `FormatOptions` object; `FORMAT_FIELDS` declares which subset is relevant per
// language so the view renders only the controls that affect that language.

import type { Language } from "./languages";

export type IndentStyle = "space" | "tab";
export type QuoteStyle = "double" | "single";
export type TrailingComma = "all" | "es5" | "none";
export type ProseWrap = "preserve" | "always" | "never";
export type SqlKeywordCase = "preserve" | "upper" | "lower";

/** SQL dialects exposed in the Format SQL dropdown (a subset of sql-formatter's). */
export type SqlDialect =
  | "sql"
  | "postgresql"
  | "mysql"
  | "mariadb"
  | "sqlite"
  | "bigquery"
  | "tsql"
  | "plsql"
  | "redshift"
  | "spark"
  | "snowflake";

export interface FormatOptions {
  indentStyle: IndentStyle;
  indentSize: number;
  printWidth: number;
  quotes: QuoteStyle;
  semicolons: boolean;
  trailingComma: TrailingComma;
  proseWrap: ProseWrap;
  sqlDialect: SqlDialect;
  sqlKeywordCase: SqlKeywordCase;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indentStyle: "space",
  indentSize: 2,
  printWidth: 80,
  quotes: "double",
  semicolons: true,
  trailingComma: "all",
  proseWrap: "preserve",
  sqlDialect: "sql",
  sqlKeywordCase: "upper",
};

// Which options each language actually honors. Order here is the order the
// controls render in the form.
export const FORMAT_FIELDS: Record<Language, (keyof FormatOptions)[]> = {
  javascript: ["indentStyle", "indentSize", "printWidth", "quotes", "semicolons", "trailingComma"],
  typescript: ["indentStyle", "indentSize", "printWidth", "quotes", "semicolons", "trailingComma"],
  css: ["indentStyle", "indentSize", "printWidth"],
  scss: ["indentStyle", "indentSize", "printWidth"],
  less: ["indentStyle", "indentSize", "printWidth"],
  html: ["indentStyle", "indentSize", "printWidth"],
  xml: ["indentStyle", "indentSize", "printWidth"],
  sql: ["indentStyle", "indentSize", "sqlDialect", "sqlKeywordCase"],
  markdown: ["printWidth", "proseWrap"],
  yaml: ["indentSize"],
};
