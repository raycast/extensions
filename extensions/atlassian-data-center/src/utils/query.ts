import {
  CQL_OPERATORS,
  JQL_OPERATORS,
  CQL_FIELDS,
  JQL_FIELDS,
  QUERY_TYPE,
  MIN_CLAUSE_LENGTH,
  REPLACE_CURRENT_USER,
} from "@/constants";
import type { QueryType, LogicOperator, ProcessUserInputParams } from "@/types";

type ProcessUserInputResult =
  | {
      clauses: string[];
      logicOperator: LogicOperator;
      orderBy?: string;
    }
  | string;

export function processUserInputAndFilter(params: ProcessUserInputParams): ProcessUserInputResult {
  const { userInput, filter, buildClauseFromText, queryType } = params;

  const filterLogicOperator = filter?.logicOperator || "AND";
  const filterOrderBy = filter?.orderBy;
  const filterClause = filter?.query || "";

  const isCompleteClause = queryType === QUERY_TYPE.JQL ? isJQL : isCQL;
  if (isCompleteClause(userInput)) {
    if (hasOrderBy(userInput)) return userInput;

    const parsed = parseQuery(userInput);
    return {
      clauses: [parsed.clause].filter(Boolean),
      logicOperator: filterLogicOperator,
      orderBy: filterOrderBy,
    };
  }

  // Only escape quotes if user input is not a complete JQL/CQL clause
  const escapedUserInput = userInput ? escapeQuotes(userInput) : "";
  let userClause = escapedUserInput ? buildClauseFromText(escapedUserInput) : "";
  if (filter?.transform) {
    userClause = filter.transform(userClause);
  }

  return {
    clauses: [userClause, filterClause].filter(Boolean),
    logicOperator: filterLogicOperator,
    orderBy: filterOrderBy,
  };
}
type BuildQueryParams = {
  clauses: string[];
  logicOperator: LogicOperator;
  /** without `ORDER BY` */
  orderBy?: string;
  queryType: QueryType;
};

export function buildQuery(params: BuildQueryParams): string {
  const { clauses, logicOperator, orderBy, queryType } = params;

  const where = combineClauses({ clauses, logicOperator, queryType });

  const orderByClause = orderBy ? ` ORDER BY ${orderBy}` : "";

  const finalQuery = where + orderByClause;

  return normalizeSpaces(finalQuery);
}

type CombineClausesParams = {
  clauses: string[];
  logicOperator: LogicOperator;
  queryType: QueryType;
};

export function combineClauses(params: CombineClausesParams): string {
  const { clauses, logicOperator } = params;
  const validClauses = clauses.filter((clause) => clause.trim());

  if (!validClauses.length) {
    return "";
  }

  if (validClauses.length === 1) {
    return validClauses[0];
  }

  return joinClauses(validClauses, logicOperator);
}

function joinClauses(clauses: string[], logicOperator: LogicOperator): string {
  return clauses.map((clause) => `(${clause.trim()})`).join(` ${logicOperator} `);
}

function normalizeSpaces(input: string): string {
  return input.trim().replace(/\s{2,}/g, " ");
}

function hasValidValue(input: string): boolean {
  const parts = input.trim().split(/\s+/);

  // Need at least 3 parts (field, operator, value)
  if (parts.length < 3) return false;

  // Get the value part (everything after the first two parts)
  const valuePart = parts.slice(2).join(" ").trim();

  // Check if value is just quotes (single or double)
  if (valuePart === '"' || valuePart === '""' || valuePart === "'" || valuePart === "''") {
    return false;
  }

  // Additional check: if the value part contains only escaped quotes, it's invalid
  if (valuePart === '\\"' || valuePart === '\\""' || valuePart === "\\'" || valuePart === "\\''") {
    return false;
  }

  return true;
}

function escapeQuotes(input: string): string {
  // If input contains quotes, need to be escaped
  return input.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function isJQL(input: string): boolean {
  if (input.length < MIN_CLAUSE_LENGTH) return false;

  // Check for complete clause structure: `<field> <operator> <value>`
  // Note: This only performs basic structural validation, as different fields support specific operators in practice
  // For example: summary field supports ~, = text operators, but not >, < numeric comparison operators
  // Additionally, value parts have function usage restrictions, e.g. currentUser() only applies to specific fields
  // To avoid over-complexity, strict field-operator-value combination validation is not implemented

  const lowerInput = input.toLowerCase();

  // Check for field presence
  const hasField = JQL_FIELDS.some((field) => lowerInput.includes(field));
  if (!hasField) return false;

  // Check for operator presence
  const hasOperator = JQL_OPERATORS.some((operator) => lowerInput.includes(operator));
  if (!hasOperator) return false;

  // Check for value presence - basic check for non-empty content
  const hasValue = hasValidValue(input);
  return hasValue;
}

export function isCQL(query: string): boolean {
  if (query.length < MIN_CLAUSE_LENGTH) return false;

  // Check for complete clause structure: `<field> <operator> <value>`
  // Note: This only performs basic structural validation, as different fields support specific operators in practice
  // For example: text field supports ~, = text operators, but not >, < numeric comparison operators
  // Additionally, value parts have function usage restrictions, e.g. currentUser() only applies to specific fields
  // To avoid over-complexity, strict field-operator-value combination validation is not implemented

  // Check for field presence
  const hasField = CQL_FIELDS.some((field) => query.includes(field));
  if (!hasField) return false;

  // Check for operator presence
  const hasOperator = CQL_OPERATORS.some((operator) => query.includes(operator));
  if (!hasOperator) return false;

  // Check for value presence - basic check for non-empty content
  const hasValue = hasValidValue(query);
  return hasValue;
}

type ValidateQueryParams = {
  query: string;
  queryType: QueryType;
};

export function validateQuery(params: ValidateQueryParams): { isValid: boolean; error?: string } {
  const { query, queryType } = params;

  const isQuery = queryType === QUERY_TYPE.JQL ? isJQL : isCQL;
  if (!isQuery(query)) return { isValid: true };

  try {
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return { isValid: false, error: "Unmatched parentheses" };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: `${queryType} syntax error` };
  }
}

export function hasOrderBy(input: string): boolean {
  return /\bORDER\s+BY\s+\S+/i.test(input);
}

export function parseQuery(input: string): { clause: string; orderBy: string } {
  const normalizedInput = normalizeSpaces(input);
  const orderByMatch = normalizedInput.match(/\bORDER\s+BY\b(.+)$/i);

  if (orderByMatch) {
    const orderBy = orderByMatch[0];
    const clause = normalizedInput.replace(/\bORDER\s+BY\b.+$/i, "").trim();
    return { clause, orderBy };
  }

  return { clause: normalizedInput, orderBy: "" };
}

export function replaceQueryCurrentUser(query: string, username: string): string {
  if (!query || !username || !REPLACE_CURRENT_USER) return query;
  return query.replace(/\bcurrentUser\(\)/gi, username);
}
