import { PostgreSQL, EntityContextType } from "dt-sql-parser";

export type SQLContext = "keyword" | "table" | "column" | null;

const parser = new PostgreSQL();

const SQL_KEYWORDS = [
  "LIKE",
  "ILIKE",
  "=",
  "!=",
  "<>",
  ">",
  "<",
  ">=",
  "<=",
  "IN",
  "NOT IN",
  "IS NULL",
  "IS NOT NULL",
  "BETWEEN",
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "ON",
  "AND",
  "OR",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "AS",
  "INSERT INTO",
  "UPDATE",
  "DELETE FROM",
  "CREATE TABLE",
  "DROP TABLE",
  "ALTER TABLE",
];

export function getSQLContext(query: string): { context: SQLContext; partial: string } {
  const trimmed = query.trim();
  if (!trimmed) return { context: "keyword", partial: "" };

  // FROM/JOIN with complete table name + space → expect keywords
  if (/\b(?:FROM|(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+)?JOIN)\s+\w+\s+$/i.test(query)) {
    return { context: "keyword", partial: "" };
  }

  // FROM with optional partial → expect table
  const fromMatch = query.match(/\bFROM\s+([\w]*)$/i);
  if (fromMatch) return { context: "table", partial: fromMatch[1] || "" };

  // JOIN (any type) with optional partial → expect table
  const joinMatch = query.match(/\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+)?JOIN\s+([\w]*)$/i);
  if (joinMatch) return { context: "table", partial: joinMatch[1] || "" };

  // WHERE/AND/OR column operator → expect keywords
  const operatorMatch = query.match(/\b(WHERE|AND|OR)\s+\w+\s+([\w]*)$/i);
  if (operatorMatch) return { context: "keyword", partial: operatorMatch[2] || "" };

  // WHERE/AND/OR with optional partial → expect column
  const whereMatch = query.match(/\b(WHERE|AND|OR)\s+([\w]*)$/i);
  if (whereMatch) return { context: "column", partial: whereMatch[2] || "" };

  // Qualified column reference (table.col)
  const dotMatch = query.match(/\b([a-zA-Z_]\w*)\.([\w]*)$/);
  if (dotMatch) return { context: "column", partial: dotMatch[2] || "" };

  try {
    const suggestions = parser.getSuggestionAtCaretPosition(trimmed, {
      lineNumber: 1,
      column: trimmed.length + 1,
    });

    if (suggestions?.syntax?.length) {
      const { syntaxContextType: ctx, wordRanges } = suggestions.syntax[0];
      const partial = wordRanges?.[0]?.text || "";

      if (
        ctx === EntityContextType.TABLE ||
        ctx === EntityContextType.TABLE_CREATE ||
        ctx === EntityContextType.VIEW ||
        ctx === EntityContextType.VIEW_CREATE
      ) {
        return { context: "table", partial };
      }
      if (ctx === EntityContextType.COLUMN || ctx === EntityContextType.COLUMN_CREATE) {
        return { context: "column", partial };
      }
    }

    if (suggestions?.keywords?.length) {
      const lastWord = trimmed.split(/\s+/).pop() || "";
      return { context: "keyword", partial: lastWord };
    }

    return { context: "keyword", partial: "" };
  } catch {
    const lastWord = trimmed.split(/\s+/).pop() || "";
    return { context: "keyword", partial: lastWord };
  }
}

export function getSQLKeywordSuggestions(partial: string): string[] {
  const upper = partial.toUpperCase();
  return SQL_KEYWORDS.filter((k) => !upper || k.startsWith(upper)).slice(0, 5);
}

export function filterSuggestions(items: string[], partial: string): string[] {
  const lower = partial.toLowerCase();
  return items.filter((item) => item.toLowerCase().includes(lower)).slice(0, 10);
}

export function extractTableNameFromQuery(query: string): string | null {
  const dotMatch = query.match(/\b([a-zA-Z_]\w*)\.\w*$/);
  if (dotMatch) return dotMatch[1];

  const fromMatch = query.match(/FROM\s+([a-zA-Z_]\w*)/i);
  return fromMatch?.[1] || null;
}
