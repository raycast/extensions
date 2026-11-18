import { TemplateContext, getPathByLevel } from "./template-context";
import { parseTemplate } from "./template-parser";

const VARIABLE_MAPPING: Record<string, (ctx: TemplateContext) => string> = {
  url: (ctx) => ctx.url,
  protocol: (ctx) => ctx.protocol,
  host: (ctx) => ctx.host,
  hostname: (ctx) => ctx.hostname, // Alias
  port: (ctx) => ctx.port || "",
  path: (ctx) => ctx.path,
  query: (ctx) => ctx.query,
  hash: (ctx) => ctx.hash,
};

function resolveVariable(variableName: string, modifiers: string[], context: TemplateContext): string {
  // Handle path level selection {{path:N}}
  if (variableName === "path") {
    if (modifiers.includes("*")) {
      // Expansion logic is handled by expandPathHierarchy
      throw new Error("path:* should be handled by expander");
    }

    // Handle {{path:N}} - supports positive and negative integers
    const levelMatch = modifiers.find((m) => /^-?\d+$/.test(m));
    if (levelMatch) {
      const level = parseInt(levelMatch, 10);
      return getPathByLevel(context.pathSegments, level);
    }

    // Default: return full path
    return context.path;
  }

  // Other variables
  const resolver = VARIABLE_MAPPING[variableName];
  if (!resolver) {
    console.warn(`Unknown variable: ${variableName}`);
    return "";
  }

  return resolver(context);
}

function renderSimpleTemplate(template: string, context: TemplateContext): string {
  const tokens = parseTemplate(template);
  let result = "";

  for (const token of tokens) {
    if (token.type === "literal") {
      result += token.value;
    } else if (token.type === "variable" && token.variableName) {
      const value = resolveVariable(token.variableName, token.modifiers || [], context);
      result += value;
    }
  }

  return result;
}

export function expandPathHierarchy(template: string, context: TemplateContext): string[] {
  const { pathSegments } = context;
  const results: string[] = [];

  // If no path segments, return root path
  if (pathSegments.length === 0) {
    return [renderSimpleTemplate(template.replace(/\{\{path:\*\}\}/g, "/"), { ...context, path: "/" })];
  }

  // From level 1 to full path
  for (let level = 1; level <= pathSegments.length; level++) {
    const pathAtLevel = getPathByLevel(pathSegments, level);
    const levelContext = {
      ...context,
      path: pathAtLevel,
    };

    // Replace {{path:*}} in template
    const levelTemplate = template.replace(/\{\{path:\*\}\}/g, pathAtLevel);

    // Render template (should not have expansion variables at this point)
    const url = renderSimpleTemplate(levelTemplate, levelContext);
    results.push(url);
  }

  return results;
}

export function renderTemplate(template: string, context: TemplateContext): string | string[] {
  const tokens = parseTemplate(template);

  // Check if there's an expansion variable
  const hasExpansion = tokens.some((t) => t.type === "variable" && t.modifiers?.includes("*"));

  if (!hasExpansion) {
    // Simple replacement, return single URL
    return renderSimpleTemplate(template, context);
  } else {
    // Need expansion, return URL array
    return expandPathHierarchy(template, context);
  }
}
