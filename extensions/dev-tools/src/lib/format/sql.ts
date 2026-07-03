import { format as formatSql } from "sql-formatter";
import type { FormatOptions } from "../format-options";

export function formatSqlCode(code: string, options: FormatOptions): Promise<string> {
  if (!code.trim()) return Promise.resolve("");
  return Promise.resolve(
    formatSql(code, {
      language: options.sqlDialect,
      keywordCase: options.sqlKeywordCase,
      tabWidth: options.indentSize,
      useTabs: options.indentStyle === "tab",
    }),
  );
}
