import { SQLDialect, SQLEntryType } from "../types";

export const DIALECT_LABELS: Record<SQLDialect, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  tsql: "T-SQL",
};

export const DIALECT_ORDER: SQLDialect[] = ["postgres", "mysql", "sqlite", "tsql"];

export const ENTRY_TYPE_LABELS: Record<SQLEntryType, string> = {
  keyword: "Keyword",
  clause: "Clause",
  function: "Function",
  operator: "Operator",
  datatype: "Data Type",
  pattern: "Pattern",
};

export const TYPE_PRIORITY: Record<SQLEntryType, number> = {
  keyword: 40,
  clause: 36,
  pattern: 34,
  function: 30,
  operator: 24,
  datatype: 18,
};
