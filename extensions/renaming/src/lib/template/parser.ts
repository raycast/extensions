/**
 * Template parser for {variable:format} syntax
 *
 * Parses template strings like "{date:YYYY-MM-DD}_{original}_{counter:001}"
 * into an array of tokens for later processing.
 */

import type { ParsedTemplate, TemplateToken, TemplateLiteralToken, TemplateVariableToken } from "../../types";
import { isKnownVariable } from "./variable-registry";

// Regex to match {variable} or {variable:format} patterns
// Supports nested dots for metadata access (e.g., {exif.dateTaken:YYYY-MM-DD})
const VARIABLE_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_.]*?)(?::([^}]+))?\}/g;

/**
 * Parse a template string into tokens
 *
 * @param template - Template string with {variable:format} placeholders
 * @returns ParsedTemplate with tokens array and metadata
 *
 * @example
 * parseTemplate("{date:YYYY-MM-DD}_{original}")
 * // Returns: {
 * //   tokens: [
 * //     { type: "variable", name: "date", format: "YYYY-MM-DD", fullMatch: "{date:YYYY-MM-DD}" },
 * //     { type: "literal", value: "_" },
 * //     { type: "variable", name: "original", format: undefined, fullMatch: "{original}" }
 * //   ],
 * //   variables: ["date", "original"],
 * //   raw: "{date:YYYY-MM-DD}_{original}"
 * // }
 */
export function parseTemplate(template: string): ParsedTemplate {
  const tokens: TemplateToken[] = [];
  const variables: string[] = [];
  let lastIndex = 0;

  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    const fullMatch = match[0]!;
    const name = match[1]!;
    const format = match[2] as string | undefined;
    const matchStart = match.index;

    // Add any literal text before this variable
    if (matchStart > lastIndex) {
      const literalValue = template.slice(lastIndex, matchStart);
      tokens.push(createLiteralToken(literalValue));
    }

    // Add the variable token
    const variableToken = createVariableToken(name, format, fullMatch);
    tokens.push(variableToken);

    // Track unique variable names (base name without format)
    const baseName = name.split(".")[0]!;
    if (!variables.includes(baseName)) {
      variables.push(baseName);
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add any remaining literal text after the last variable
  if (lastIndex < template.length) {
    const literalValue = template.slice(lastIndex);
    tokens.push(createLiteralToken(literalValue));
  }

  return {
    tokens,
    variables,
    raw: template,
  };
}

/**
 * Create a literal token
 */
function createLiteralToken(value: string): TemplateLiteralToken {
  return {
    type: "literal",
    value,
  };
}

/**
 * Create a variable token
 */
function createVariableToken(name: string, format: string | undefined, fullMatch: string): TemplateVariableToken {
  return {
    type: "variable",
    name,
    format,
    fullMatch,
  };
}

/**
 * Validate a template string
 *
 * @param template - Template string to validate
 * @returns Validation result with any errors
 */
export function validateTemplate(template: string): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // Empty template
  if (!template || template.trim().length === 0) {
    return { valid: false, error: "Template cannot be empty" };
  }

  // Check for unbalanced braces
  const openBraces = (template.match(/\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return { valid: false, error: "Unbalanced braces in template" };
  }

  // Check for empty variables {}
  if (template.includes("{}")) {
    return { valid: false, error: "Empty variable placeholder {}" };
  }

  // Check for invalid variable names
  const invalidVarPattern = /\{([^a-zA-Z][^}]*)\}/;
  const invalidMatch = template.match(invalidVarPattern);
  if (invalidMatch) {
    return {
      valid: false,
      error: `Invalid variable name: ${invalidMatch[0]}. Variables must start with a letter.`,
    };
  }

  // Parse and check for known variables
  const parsed = parseTemplate(template);

  for (const token of parsed.tokens) {
    if (token.type === "variable") {
      if (!isKnownVariable(token.name)) {
        warnings.push(`Unknown variable: {${token.name}}`);
      }
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Extract all variable names from a template
 */
export function extractVariables(template: string): string[] {
  const parsed = parseTemplate(template);
  return parsed.tokens
    .filter((token): token is TemplateVariableToken => token.type === "variable")
    .map((token) => token.name);
}

/**
 * Check if a template contains a specific variable
 */
export function hasVariable(template: string, variableName: string): boolean {
  const variables = extractVariables(template);
  return variables.some((v) => v === variableName || v.startsWith(`${variableName}.`));
}

/**
 * Replace a variable in a template with a new pattern
 */
export function replaceVariable(template: string, variableName: string, replacement: string): string {
  // Escape all regex metacharacters in the variable name
  const escaped = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\{${escaped}(?::[^}]+)?\\}`, "g");
  return template.replace(pattern, () => replacement);
}
