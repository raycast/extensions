import Mustache, { TemplateSpans } from "mustache";

/**
 * Extracts placeholder names from a Mustache template for validation.
 * Used to detect orphaned placeholders and unused arguments before saving prompts.
 */
export function extractPlaceholders(template: string): string[] {
  try {
    const tokens = Mustache.parse(template);
    const placeholders = new Set<string>();

    function extractFromTokens(tokens: TemplateSpans): void {
      for (const token of tokens) {
        // Token types: "name" = escaped variables, "&" = unescaped variables,
        // "#" = sections, "^" = inverted sections, ">" = partials
        if (token[0] === "name" || token[0] === "&" || token[0] === "#" || token[0] === "^" || token[0] === ">") {
          placeholders.add(token[1]);
        }
        // Check for nested tokens in sections (token[4] contains TemplateSpans for sections)
        if (token.length > 4 && token[4] && Array.isArray(token[4])) {
          extractFromTokens(token[4]);
        }
      }
    }

    extractFromTokens(tokens);
    return Array.from(placeholders);
  } catch {
    return [];
  }
}

export function validateTemplate(
  template: string,
  argumentNames: string[] = [],
): {
  isValid: boolean;
  error?: string;
} {
  if (!template) {
    return { isValid: false, error: "Template must be a non-empty string" };
  }

  try {
    Mustache.parse(template);
  } catch (error) {
    return { isValid: false, error: `Template syntax error: ${error}` };
  }

  if (argumentNames.length > 0) {
    const placeholders = extractPlaceholders(template);

    const orphanedPlaceholders = placeholders.filter((placeholder) => !argumentNames.includes(placeholder));

    if (orphanedPlaceholders.length > 0) {
      return {
        isValid: false,
        error: `Template has placeholders without corresponding arguments: ${orphanedPlaceholders.join(", ")}`,
      };
    }

    const unusedArguments = argumentNames.filter((argName) => !placeholders.includes(argName));

    if (unusedArguments.length > 0) {
      return {
        isValid: false,
        error: `Arguments not used in template: ${unusedArguments.join(", ")}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Process a Mustache template with provided arguments.
 * Preserves whitespace and formatting in the output.
 */
export function processTemplate(template: string, providedArgs: Record<string, unknown>): string {
  return Mustache.render(template, providedArgs);
}
