export interface TemplateToken {
  type: "literal" | "variable";
  value: string;
  variableName?: string;
  modifiers?: string[];
}

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

function parseVariable(variableText: string): {
  name: string;
  modifiers: string[];
} {
  const parts = variableText.split(":");
  const name = parts[0].trim();
  const modifiers = parts.slice(1).map((m) => m.trim());
  return { name, modifiers };
}

export function parseTemplate(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  VARIABLE_PATTERN.lastIndex = 0;

  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    // Add literal part (before variable)
    if (match.index > lastIndex) {
      tokens.push({
        type: "literal",
        value: template.substring(lastIndex, match.index),
      });
    }

    // Parse variable
    const variableText = match[1];
    const { name, modifiers } = parseVariable(variableText);

    tokens.push({
      type: "variable",
      value: match[0],
      variableName: name,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    });

    lastIndex = VARIABLE_PATTERN.lastIndex;
  }

  // Add remaining literal part
  if (lastIndex < template.length) {
    tokens.push({
      type: "literal",
      value: template.substring(lastIndex),
    });
  }

  return tokens;
}
