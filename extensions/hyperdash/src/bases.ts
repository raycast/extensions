import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export type FilterExpression = {
  property: string;
  operator: string;
  values: string[];
};

export type BaseView = {
  name: string;
  type: string;
  filters: FilterExpression[];
  combineWith: "and" | "or";
};

export type BaseConfig = {
  filters: FilterExpression[];
  combineWith: "and" | "or";
  vaultPath?: string;
  views: BaseView[];
};

/**
 * Parse a filter expression string like 'tags.containsAny("ja/todo", "ae/todo")'
 * into a structured format
 */
function parseFilterExpression(expr: string): FilterExpression | null {
  // Handle negation
  const isNegated = expr.trim().startsWith("!");
  const cleanExpr = isNegated ? expr.trim().substring(1) : expr.trim();

  // Match property.operator(values) format
  const match = cleanExpr.match(/^([a-z._]+)\.([a-zA-Z]+)\((.*?)\)$/i);
  if (match) {
    const [, property, operator, argsStr] = match;
    // Extract quoted values
    const valueMatches = argsStr.match(/["']([^"']+)["']/g) || [];
    const values = valueMatches.map((v) => v.replace(/["']/g, "").trim());

    return {
      property: property.toLowerCase(),
      operator: isNegated ? `!${operator}` : operator,
      values,
    };
  }

  // Handle equality format: property == ["value"]
  const eqMatch = cleanExpr.match(/^([a-z._]+)\s*==\s*\[(.*?)\]$/i);
  if (eqMatch) {
    const [, property, argsStr] = eqMatch;
    const valueMatches = argsStr.match(/["']([^"']+)["']/g) || [];
    const values = valueMatches.map((v) => v.replace(/["']/g, "").trim());

    return {
      property: property.toLowerCase(),
      operator: isNegated ? "!equals" : "equals",
      values,
    };
  }

  return null;
}

/**
 * Read and parse a .base file to extract all filter configurations
 */
export async function readBaseConfig(
  filePath: string,
): Promise<BaseConfig | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = YAML.parse(raw) as any;

    const filters: FilterExpression[] = [];
    let combineWith: "and" | "or" = "or";

    // Parse top-level filters
    if (doc?.filters?.or && Array.isArray(doc.filters.or)) {
      combineWith = "or";
      for (const item of doc.filters.or) {
        if (typeof item === "string") {
          const parsed = parseFilterExpression(item);
          if (parsed) filters.push(parsed);
        }
      }
    } else if (doc?.filters?.and && Array.isArray(doc.filters.and)) {
      combineWith = "and";
      for (const item of doc.filters.and) {
        if (typeof item === "string") {
          const parsed = parseFilterExpression(item);
          if (parsed) filters.push(parsed);
        }
      }
    }

    // Parse views
    const views: BaseView[] = [];
    if (doc?.views && Array.isArray(doc.views)) {
      for (const viewDoc of doc.views) {
        const viewFilters: FilterExpression[] = [];
        let viewCombineWith: "and" | "or" = "or";

        if (viewDoc?.filters?.or && Array.isArray(viewDoc.filters.or)) {
          viewCombineWith = "or";
          for (const item of viewDoc.filters.or) {
            if (typeof item === "string") {
              const parsed = parseFilterExpression(item);
              if (parsed) viewFilters.push(parsed);
            }
          }
        } else if (
          viewDoc?.filters?.and &&
          Array.isArray(viewDoc.filters.and)
        ) {
          viewCombineWith = "and";
          for (const item of viewDoc.filters.and) {
            if (typeof item === "string") {
              const parsed = parseFilterExpression(item);
              if (parsed) viewFilters.push(parsed);
            }
          }
        }

        if (viewDoc?.name) {
          views.push({
            name: viewDoc.name,
            type: viewDoc.type || "table",
            filters: viewFilters,
            combineWith: viewCombineWith,
          });
        }
      }
    }

    // Find vault root by looking for .obsidian folder
    const vaultPath = await findVaultRoot(filePath);

    return {
      filters,
      combineWith,
      vaultPath: vaultPath || undefined,
      views,
    };
  } catch {
    return null;
  }
}

/**
 * Find the Obsidian vault root by searching upward from a .base file path
 */
async function findVaultRoot(baseFilePath: string): Promise<string | null> {
  let currentDir = path.dirname(baseFilePath);
  const root = path.parse(currentDir).root;

  // Keep going up until we find .obsidian or hit the filesystem root
  while (currentDir !== root) {
    const obsidianPath = path.join(currentDir, ".obsidian");
    try {
      const stat = await fs.stat(obsidianPath);
      if (stat.isDirectory()) {
        return currentDir;
      }
    } catch {
      // .obsidian doesn't exist here, keep going up
    }
    currentDir = path.dirname(currentDir);
  }

  // If we didn't find .obsidian, use parent of the base file directory as fallback
  return path.dirname(path.dirname(baseFilePath));
}

/**
 * Evaluate a filter expression against a note
 */
export function evaluateFilter(
  filter: FilterExpression,
  note: unknown,
): boolean {
  const { property, operator, values } = filter;

  // Get the property value from the note
  let noteValue: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteObj = note as any;

  // Handle nested properties like "file.name", "file.folder"
  if (property.includes(".")) {
    const parts = property.split(".");
    noteValue = noteObj;
    for (const part of parts) {
      if (noteValue && typeof noteValue === "object") {
        noteValue = (noteValue as Record<string, unknown>)[part];
      } else {
        noteValue = undefined;
        break;
      }
    }
  } else {
    noteValue = noteObj[property];
  }

  // Convert noteValue to array for consistent handling
  const noteValues = Array.isArray(noteValue)
    ? noteValue.map((v) => String(v).toLowerCase())
    : noteValue
      ? [String(noteValue).toLowerCase()]
      : [];

  const filterValues = values.map((v) => v.toLowerCase());

  // Apply operator
  switch (operator.toLowerCase()) {
    case "contains":
      return filterValues.some((fv) =>
        noteValues.some((nv) => nv.includes(fv)),
      );

    case "!contains":
      return !filterValues.some((fv) =>
        noteValues.some((nv) => nv.includes(fv)),
      );

    case "containsany":
      return filterValues.some((fv) =>
        noteValues.some((nv) => nv.includes(fv)),
      );

    case "!containsany":
      return !filterValues.some((fv) =>
        noteValues.some((nv) => nv.includes(fv)),
      );

    case "equals":
      return filterValues.some((fv) => noteValues.includes(fv));

    case "!equals":
      return !filterValues.some((fv) => noteValues.includes(fv));

    default:
      return false;
  }
}

/**
 * Evaluate all filters against a note based on combineWith logic
 */
export function evaluateAllFilters(config: BaseConfig, note: unknown): boolean {
  if (config.filters.length === 0) return true;

  if (config.combineWith === "and") {
    return config.filters.every((filter) => evaluateFilter(filter, note));
  } else {
    return config.filters.some((filter) => evaluateFilter(filter, note));
  }
}

/**
 * Evaluate filters from a specific view
 */
export function evaluateViewFilters(view: BaseView, note: unknown): boolean {
  if (view.filters.length === 0) return true;

  if (view.combineWith === "and") {
    return view.filters.every((filter) => evaluateFilter(filter, note));
  } else {
    return view.filters.some((filter) => evaluateFilter(filter, note));
  }
}

/**
 * Evaluate base config with an optional view
 * Note must match BOTH base filters AND view filters (if view is specified)
 */
export function evaluateWithView(
  config: BaseConfig,
  note: unknown,
  viewName?: string,
): boolean {
  // First check base filters
  const matchesBase = evaluateAllFilters(config, note);
  if (!matchesBase) return false;

  // If no view specified, just use base filters
  if (!viewName) return true;

  // Find and apply view filters
  const view = config.views.find((v) => v.name === viewName);
  if (!view) return true; // View not found, just use base filters

  return evaluateViewFilters(view, note);
}

// Legacy function for backwards compatibility
export async function readBasesTag(
  filePath: string,
): Promise<string | undefined> {
  const config = await readBaseConfig(filePath);
  if (!config) return undefined;

  // Extract tags from tag-based filters
  const tagFilters = config.filters.filter((f) => f.property === "tags");
  if (tagFilters.length === 0) return undefined;

  const allTags = tagFilters.flatMap((f) => f.values);
  return allTags.map((t) => t.toLowerCase()).join(", ");
}
