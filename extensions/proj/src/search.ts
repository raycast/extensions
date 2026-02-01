import type { EnhancedProject } from "./types";
import { expandPath } from "./utils";
import {
  getAllCollections,
  matchesAutoCollection,
  getCollectionById,
} from "./collections";

export interface SearchFilters {
  collection?: string;
  lang?: string;
  org?: string;
  inPath?: string;
}

export interface ParsedSearch {
  text: string;
  filters: SearchFilters;
}

const SPECIAL_COLLECTIONS: Record<string, string> = {
  recent: "_recent",
  stale: "_stale",
  month: "_month",
  uncategorized: "_uncategorized",
};

const LANGUAGE_ALIASES: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
  node: "javascript",
  // Python
  py: "python",
  python3: "python",
  // Ruby
  rb: "ruby",
  // Rust
  rs: "rust",
  // Go
  golang: "go",
  // Kotlin
  kt: "kotlin",
  // Java
  jvm: "java",
  // C/C++
  "c++": "cpp",
  cxx: "cpp",
  cc: "cpp",
  // C#
  cs: "csharp",
  "c#": "csharp",
  dotnet: "csharp",
  // Swift
  ios: "swift",
  // Dart/Flutter
  flutter: "dart",
  // Elixir
  ex: "elixir",
  // Scala
  sc: "scala",
  // PHP
  php8: "php",
};

export function parseSearchQuery(query: string): ParsedSearch {
  const filters: SearchFilters = {};
  const textParts: string[] = [];

  const tokens = query.trim().split(/\s+/);

  for (const token of tokens) {
    if (token.startsWith("#")) {
      const collName = token.slice(1).toLowerCase();
      filters.collection = SPECIAL_COLLECTIONS[collName] || collName;
    } else if (token.startsWith("lang:")) {
      const lang = token.slice(5).toLowerCase();
      filters.lang = LANGUAGE_ALIASES[lang] || lang;
    } else if (token.startsWith("org:")) {
      filters.org = token.slice(4).toLowerCase();
    } else if (token.startsWith("in:")) {
      filters.inPath = token.slice(3);
    } else if (token) {
      textParts.push(token);
    }
  }

  return {
    text: textParts.join(" "),
    filters,
  };
}

export function matchesSearch(
  project: EnhancedProject,
  query: ParsedSearch,
): boolean {
  // Check text match
  if (query.text) {
    const searchText = query.text.toLowerCase();
    const projectName = project.name.toLowerCase();
    if (!projectName.includes(searchText)) {
      return false;
    }
  }

  // Check collection filter
  if (query.filters.collection) {
    const filterValue = query.filters.collection;

    // Check if it's a special auto collection (starts with _)
    if (filterValue.startsWith("_")) {
      const autoCollection = getCollectionById(filterValue);
      if (autoCollection && autoCollection.type === "auto") {
        if (!matchesAutoCollection(project, autoCollection)) return false;
      } else {
        return false;
      }
    } else {
      // Look up collection by name (case-insensitive)
      const allCollections = getAllCollections();
      const matchedCollection = allCollections.find(
        (c) => c.name.toLowerCase() === filterValue.toLowerCase(),
      );

      if (!matchedCollection) return false;

      // For auto collections, check criteria
      if (matchedCollection.type === "auto") {
        if (!matchesAutoCollection(project, matchedCollection)) return false;
      } else {
        // For manual collections, check if project is assigned
        if (!project.collections?.includes(matchedCollection.id)) return false;
      }
    }
  }

  // Check language filter
  if (query.filters.lang) {
    if (project.detectedLang?.toLowerCase() !== query.filters.lang) {
      return false;
    }
  }

  // Check org filter
  if (query.filters.org) {
    if (!project.gitOrg?.toLowerCase().includes(query.filters.org)) {
      return false;
    }
  }

  // Check path filter
  if (query.filters.inPath) {
    const expandedFilter = expandPath(query.filters.inPath);
    if (!project.path.startsWith(expandedFilter)) {
      return false;
    }
  }

  return true;
}
