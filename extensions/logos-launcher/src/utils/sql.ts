import { environment } from "@raycast/api";
import initSqlJs, { SqlJsStatic } from "sql.js";
import path from "path";

let sqlInstancePromise: Promise<SqlJsStatic> | undefined;

export function getSqlInstance() {
  if (!sqlInstancePromise) {
    sqlInstancePromise = initSqlJs({
      locateFile: (file: string) => path.join(environment.assetsPath, file),
    });
  }
  return sqlInstancePromise;
}

export function findColumn(columns: string[], candidates: string[]): string | undefined {
  const lowerCaseColumns = columns.map((column) => column.toLowerCase());
  for (const candidate of candidates) {
    const index = lowerCaseColumns.indexOf(candidate);
    if (index >= 0) {
      return columns[index];
    }
  }
  return undefined;
}

export function quoteIdentifier(identifier: string): string {
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}
