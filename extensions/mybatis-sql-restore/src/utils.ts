import { format } from "sql-formatter";
import { MESSAGES } from "./constants/messages";

/**
 * SQL parameter types
 */
type SqlParam = string | number | boolean;

/**
 * MyBatis log parsing result
 */
interface ParseResult {
  sql: string | null;
  params: SqlParam[];
}

/**
 * HTML entity decoder
 */
const HTML_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * 复制内容到剪贴板并退出Raycast
 */
export async function copyAndExit(content: string) {
  const { Clipboard, showHUD, popToRoot } = await import("@raycast/api");
  await Clipboard.copy(content);
  await showHUD(MESSAGES.HUD.COPIED);
  popToRoot();
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => HTML_ENTITIES[entity] || entity);
}

/**
 * Parse MyBatis log to extract SQL statement and parameters
 */
export function parseMybatisLog(log: string): ParseResult {
  // Decode HTML entities and normalize text
  const normalizedLog = normalizeLogText(decodeHtmlEntities(log));

  // Extract SQL statement and parameters
  const sql = extractSqlStatement(normalizedLog);
  const params = extractParameters(normalizedLog);

  return { sql, params };
}

/**
 * Normalize log text by unifying line breaks and whitespace
 */
function normalizeLogText(log: string): string {
  return log
    .replace(/\r\n/g, "\n") // Normalize line breaks
    .replace(/\r/g, "\n") // Normalize line breaks
    .replace(/\t/g, " ") // Convert tabs to spaces
    .trim();
}

/**
 * Extract SQL statement from normalized log text
 */
function extractSqlStatement(log: string): string | null {
  // Primary regex: Match SQL statements with "Preparing:" prefix
  const preparingRegex =
    /Preparing:\s*(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?(?=\s+\d{4}-\d{2}-\d{2}.*?Parameters:|==>.*?Parameters:|<==|$)/i;
  let sqlMatch = log.match(preparingRegex);

  // Fallback regex: Direct SQL statement matching
  if (!sqlMatch) {
    const fallbackRegex =
      /(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?(?=\s+\d{4}-\d{2}-\d{2}.*?Parameters:|Parameters:|==>|<==|\[DEBUG\]|\[INFO\]|$)/i;
    sqlMatch = log.match(fallbackRegex);
  }

  let sql = sqlMatch?.[0]?.trim() || null;

  // Clean up SQL statement by removing "Preparing:" prefix
  if (sql?.includes("Preparing:")) {
    sql = sql.replace(/.*?Preparing:\s*/, "").trim();
  }

  // Validate extracted SQL
  return isValidSql(sql) ? sql : null;
}

/**
 * Validate if the extracted text is a valid SQL statement
 */
function isValidSql(sql: string | null): boolean {
  if (!sql) return false;

  const hasValidStructure = /^(SELECT|INSERT|UPDATE|DELETE)\s+.+/i.test(sql);
  const hasMinimumLength = sql.length > 10;
  const hasValidKeywords = /(FROM|INTO|SET|WHERE|VALUES)/i.test(sql);

  return hasValidStructure && hasMinimumLength && hasValidKeywords;
}

/**
 * Extract parameters from normalized log text
 */
function extractParameters(log: string): SqlParam[] {
  // Extract parameter line with "==> Parameters:" prefix
  const paramsRegex = /==> Parameters:\s*([^]*?)(?=\s+\d{4}-\d{2}-\d{2}.*?<==|<==|$)/i;
  const paramsMatch = log.match(paramsRegex);
  let paramsString = paramsMatch?.[1]?.trim() || "";

  // If parameter string contains multiple lines, find the line with type information
  if (paramsString.includes("\n")) {
    const lines = paramsString.split("\n");
    paramsString = findParameterLine(lines) || lines[0];
    paramsString = paramsString.trim();
  }

  return parseParameterString(paramsString);
}

/**
 * Find the line containing parameter type information
 */
function findParameterLine(lines: string[]): string | undefined {
  const typePatterns = ["(Integer)", "(Long)", "(Date)", "(String)", "(Boolean)", "(Timestamp)"];
  return lines.find((line) => typePatterns.some((pattern) => line.includes(pattern)));
}

/**
 * Parse parameter string into typed values
 */
function parseParameterString(paramsString: string): SqlParam[] {
  const params: SqlParam[] = [];

  if (!paramsString) return params;

  // Enhanced regex to handle empty value parameters
  // Matches patterns like "value(Type)" or "(Type)"
  const paramRegex = /([^,()]*?)(\([^)]+\))(?=,|$)/g;
  let match;

  while ((match = paramRegex.exec(paramsString)) !== null) {
    const value = match[1].trim();
    const type = match[2].trim();

    params.push(convertParameterValue(value, type));
  }

  return params;
}

/**
 * Convert parameter value based on its type
 */
function convertParameterValue(value: string, type: string): SqlParam {
  if (type.includes("String")) {
    return value === "" ? "''" : `'${value}'`;
  }

  if (type.includes("Timestamp") || type.includes("Date")) {
    return `'${value}'`;
  }

  if (type.includes("Boolean")) {
    return value.toLowerCase() === "true";
  }

  // Numeric types (Integer, Long, etc.)
  return value === "" ? "NULL" : value;
}

/**
 * Replace SQL placeholders with parameters and format the SQL
 */
export function formatSql(sql: string, params: SqlParam[]): string {
  let formattedSql = sql;

  // Replace question mark placeholders with actual parameters
  let paramIndex = 0;
  formattedSql = formattedSql.replace(/\?/g, () => {
    const param = paramIndex < params.length ? params[paramIndex] : "?";
    paramIndex++;
    return String(param);
  });

  // Format SQL using sql-formatter
  try {
    formattedSql = format(formattedSql, {
      language: "sql",
      keywordCase: "upper",
      indentStyle: "standard",
    });
  } catch (error) {
    console.error("Failed to format SQL:", error);
  }

  return formattedSql;
}

/**
 * Format raw SQL statement without parsing MyBatis logs
 */
export function formatRawSql(sql: string): string {
  try {
    return format(sql, {
      language: "sql",
      keywordCase: "upper",
      indentStyle: "standard",
    });
  } catch (error) {
    console.error("Failed to format raw SQL:", error);
    return sql;
  }
}
