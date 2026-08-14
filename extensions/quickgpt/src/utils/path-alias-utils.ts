import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";

interface Preferences {
  pathAliases?: string;
}

const CURRENT_FLINK_PREFIX = "📁 ";
const FLINK_PREFIXES = ["fk:", "flink:", "📁:", CURRENT_FLINK_PREFIX, "📁\u00A0", "📁\u3000"];
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const FLINK_PREFIX_REGEX = new RegExp(`(${FLINK_PREFIXES.map(escapeRegExp).join("|")})`);

export function getPathAliases(): Record<string, string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const aliases = JSON.parse(preferences.pathAliases || "{}");
    const home = homedir();
    const expandedAliases: Record<string, string> = {};

    for (const [key, value] of Object.entries(aliases)) {
      if (typeof value === "string") {
        expandedAliases[key] = value.replace(/^~/, home);
      }
    }
    return expandedAliases;
  } catch (error) {
    console.error("Failed to parse path aliases:", error);
    return {};
  }
}

export function expandPath(inputPath: string): string {
  let path = preprocessPath(inputPath);
  path = replacePath(path, getPathAliases(), true).replace(/\/+/g, "/");
  return path;
}

export function compressPath(inputPath: string): string {
  return replacePath(inputPath, getPathAliases());
}

export function preprocessPath(path: string): string {
  path = path.split("\n")[0].trim();
  path = path.replace(/\[([^\]]+)\]/g, "$1.");
  path = path.replace(/\{\{([^}]+)\}\}/g, "$1.");
  path = removeFlinkPrefix(path);
  path = removeMarkdownSyntax(path);
  return path;
}

function removeFlinkPrefix(inputPath: string): string {
  return inputPath.replace(FLINK_PREFIX_REGEX, "").trim();
}

function removeMarkdownSyntax(path: string): string {
  return path.replace(/(\*\*|__)(.*?)\1/g, "$2");
}

function replacePath(inputPath: string, pathMap: Record<string, string>, reverse = false): string {
  const pathsData = Object.entries(pathMap)
    .map(([key, value]) => ({
      path: reverse ? key.replace(/\/+$/, "") : value.replace(/\/+$/, ""),
      replacement: reverse ? value.replace(/\/+$/, "") : key,
    }))
    .sort((a, b) => b.path.length - a.path.length);

  if (reverse) {
    return performReverseReplacement(inputPath, pathsData);
  } else {
    return performForwardReplacement(inputPath, pathsData);
  }
}

function performReverseReplacement(inputPath: string, pathsData: Array<{ path: string; replacement: string }>): string {
  let result = inputPath;
  let hasReplacement = true;

  while (hasReplacement) {
    hasReplacement = false;

    for (const { path, replacement } of pathsData) {
      const index = result.indexOf(path);
      if (index !== -1) {
        const before = result.slice(0, index);
        let after = result.slice(index + path.length);

        if (after.startsWith(".")) {
          after = after.slice(1);
        }

        let finalReplacement = replacement;
        if (after && !after.startsWith("/") && !replacement.endsWith("/")) {
          finalReplacement += "/";
        }

        result = before + finalReplacement + after;
        hasReplacement = true;
        break;
      }
    }
  }

  return result.replace(/\/+/g, "/");
}

function performForwardReplacement(inputPath: string, pathsData: Array<{ path: string; replacement: string }>): string {
  const normalized = inputPath.replace(/\/+$/, "");

  for (const { path, replacement } of pathsData) {
    const index = normalized.indexOf(path);
    if (index !== -1) {
      const before = normalized.slice(0, index);
      const after = normalized.slice(index + path.length);
      return before + replacement + after;
    }
  }

  return inputPath;
}
