import { getSchema, getTableByName } from "./loader";

export type IssueSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  parsedTable?: string;
  parsedColumns?: string[];
}

// Simple SQL parser - extracts table and columns from SELECT statement
function parseQuery(query: string): {
  table?: string;
  columns?: string[];
  hasWhere: boolean;
  hasLimit: boolean;
} {
  const normalized = query.replace(/\s+/g, " ").trim().toLowerCase();

  // Extract table name from FROM clause
  const fromMatch = normalized.match(/from\s+([a-z_][a-z0-9_]*)/i);
  const table = fromMatch ? fromMatch[1] : undefined;

  // Extract columns from SELECT clause
  const selectMatch = normalized.match(/select\s+(.*?)\s+from/i);
  let columns: string[] = [];
  if (selectMatch) {
    const columnsPart = selectMatch[1];
    if (columnsPart.trim() === "*") {
      columns = ["*"];
    } else {
      columns = columnsPart
        .split(",")
        .map((c) =>
          c
            .trim()
            .split(/\s+as\s+/i)[0]
            .trim(),
        ) // Handle aliases
        .filter((c) => c.length > 0);
    }
  }

  const hasWhere = /\bwhere\b/i.test(normalized);
  const hasLimit = /\blimit\b/i.test(normalized);

  return { table, columns, hasWhere, hasLimit };
}

// Extract columns used in WHERE clause
function parseWhereColumns(query: string): string[] {
  const normalized = query.replace(/\s+/g, " ").trim();
  const whereMatch = normalized.match(
    /where\s+(.+?)(?:order|group|limit|;|$)/i,
  );

  if (!whereMatch) return [];

  const whereClause = whereMatch[1];
  const columns: string[] = [];

  // Match column names before operators
  const matches = whereClause.matchAll(
    /([a-z_][a-z0-9_]*)\s*(?:=|!=|<>|<=|>=|<|>|like|in|is)/gi,
  );
  for (const match of matches) {
    columns.push(match[1].toLowerCase());
  }

  return [...new Set(columns)];
}

export function validateQuery(
  query: string,
  platform: string = "darwin",
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!query.trim()) {
    return {
      valid: false,
      issues: [{ severity: "error", message: "Query is empty" }],
    };
  }

  // Check for SELECT statement
  if (!/^\s*select\b/i.test(query)) {
    issues.push({
      severity: "error",
      message: "Query must start with SELECT",
      suggestion: "osquery only supports SELECT statements",
    });
    return { valid: false, issues };
  }

  const parsed = parseQuery(query);

  if (!parsed.table) {
    issues.push({
      severity: "error",
      message: "Could not find table name in FROM clause",
    });
    return { valid: false, issues };
  }

  // Check if table exists
  const table = getTableByName(parsed.table);
  if (!table) {
    // Try to suggest similar tables
    const allTables = getSchema();
    const similar = allTables
      .filter(
        (t) =>
          t.name.includes(parsed.table!) ||
          parsed.table!.includes(t.name.slice(0, 4)),
      )
      .slice(0, 3)
      .map((t) => t.name);

    issues.push({
      severity: "error",
      message: `Unknown table: ${parsed.table}`,
      suggestion:
        similar.length > 0 ? `Did you mean: ${similar.join(", ")}?` : undefined,
    });
    return { valid: false, issues, parsedTable: parsed.table };
  }

  // Check platform compatibility
  if (platform !== "all" && !table.platforms.includes(platform)) {
    issues.push({
      severity: "error",
      message: `Table "${table.name}" is not available on ${platform}`,
      suggestion: `Available on: ${table.platforms.join(", ")}`,
    });
  }

  // Check columns exist
  if (parsed.columns && parsed.columns[0] !== "*") {
    const tableColumns = table.columns.map((c) => c.name.toLowerCase());

    for (const col of parsed.columns) {
      // Skip functions and expressions
      if (col.includes("(") || col.includes(")")) continue;

      const colName = col.toLowerCase().replace(/^[a-z]+\./, ""); // Remove table prefix
      if (!tableColumns.includes(colName)) {
        const similar = tableColumns.filter(
          (tc) => tc.includes(colName) || colName.includes(tc.slice(0, 3)),
        );
        issues.push({
          severity: "error",
          message: `Unknown column: ${col}`,
          suggestion:
            similar.length > 0
              ? `Did you mean: ${similar.slice(0, 3).join(", ")}?`
              : undefined,
        });
      }
    }
  }

  // Check required columns
  const requiredColumns = table.columns
    .filter((c) => c.required)
    .map((c) => c.name.toLowerCase());
  if (requiredColumns.length > 0) {
    const whereColumns = parseWhereColumns(query);
    const missingRequired = requiredColumns.filter(
      (rc) => !whereColumns.includes(rc),
    );

    if (missingRequired.length > 0) {
      issues.push({
        severity: "error",
        message: `Table "${table.name}" requires WHERE clause with: ${missingRequired.join(", ")}`,
        suggestion: `Add: WHERE ${missingRequired.map((c) => `${c} = '<value>'`).join(" AND ")}`,
      });
    }
  }

  // Best practice warnings
  if (parsed.columns && parsed.columns[0] === "*") {
    issues.push({
      severity: "warning",
      message: "Using SELECT * may return more data than needed",
      suggestion: "Consider selecting specific columns",
    });
  }

  if (!parsed.hasLimit) {
    issues.push({
      severity: "warning",
      message: "No LIMIT clause",
      suggestion: "Consider adding LIMIT to prevent large result sets",
    });
  }

  if (table.evented) {
    issues.push({
      severity: "info",
      message: `"${table.name}" is an evented table`,
      suggestion: "It subscribes to OS events and may behave differently",
    });
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    parsedTable: parsed.table,
    parsedColumns: parsed.columns,
  };
}
