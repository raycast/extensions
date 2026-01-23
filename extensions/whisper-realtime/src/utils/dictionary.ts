import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Dictionary file path matching Python implementation
export const DICTIONARY_DIR = join(homedir(), ".config", "whisper-realtime");
export const DICTIONARY_PATH = join(DICTIONARY_DIR, "dictionary.json");

// Types matching Python dictionary.py
export interface ReplacementRule {
  id: string; // UUID for React key
  pattern: string;
  replacement: string;
  is_regex: boolean;
}

export interface ContextRule {
  id: string; // UUID for React key
  pattern: string;
  replacement: string;
  context_keywords: string[];
  negative_keywords: string[];
  window_size: number;
}

export interface DictionaryData {
  simple: Record<string, string>;
  replacements: ReplacementRule[];
  context_rules: ContextRule[];
}

// Display type for unified list view
export type DictionaryEntryType = "simple" | "replacement" | "context";

export interface DictionaryEntry {
  id: string;
  type: DictionaryEntryType;
  pattern: string;
  replacement: string;
  // For replacement rules
  is_regex?: boolean;
  // For context rules
  context_keywords?: string[];
  negative_keywords?: string[];
  window_size?: number;
}

// Generate UUID
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Create example dictionary (matching Python)
function createExampleDictionary(): DictionaryData {
  return {
    simple: {
      ウィスパー: "Whisper",
      クロード: "Claude",
    },
    replacements: [
      {
        id: generateId(),
        pattern: "エーアイ",
        replacement: "AI",
        is_regex: false,
      },
    ],
    context_rules: [
      {
        id: generateId(),
        pattern: "家具",
        replacement: "KAG",
        context_keywords: [
          "会社",
          "開発",
          "プロジェクト",
          "チーム",
          "株式会社",
          "サービス",
        ],
        negative_keywords: ["インテリア", "家具屋", "ソファ"],
        window_size: 100,
      },
    ],
  };
}

// Ensure IDs exist for all entries
function ensureIds(data: Partial<DictionaryData>): DictionaryData {
  const result: DictionaryData = {
    simple: data.simple || {},
    replacements: (data.replacements || []).map((r) => ({
      ...r,
      id: r.id || generateId(),
    })),
    context_rules: (data.context_rules || []).map((r) => ({
      ...r,
      id: r.id || generateId(),
    })),
  };
  return result;
}

// Load dictionary from file
export async function loadDictionary(): Promise<DictionaryData> {
  try {
    if (!existsSync(DICTIONARY_PATH)) {
      // Create default dictionary
      const defaultDict = createExampleDictionary();
      await saveDictionary(defaultDict);
      return defaultDict;
    }

    const content = await readFile(DICTIONARY_PATH, "utf-8");
    const data = JSON.parse(content) as Partial<DictionaryData>;
    return ensureIds(data);
  } catch (error) {
    console.error("Failed to load dictionary:", error);
    // Return empty dictionary on error
    return ensureIds({});
  }
}

// Save dictionary to file
export async function saveDictionary(data: DictionaryData): Promise<void> {
  try {
    // Ensure directory exists
    if (!existsSync(DICTIONARY_DIR)) {
      await mkdir(DICTIONARY_DIR, { recursive: true });
    }

    // Save without IDs (matching Python format)
    const saveData = {
      simple: data.simple,
      replacements: data.replacements.map(
        ({ pattern, replacement, is_regex }) => ({
          pattern,
          replacement,
          is_regex,
        }),
      ),
      context_rules: data.context_rules.map(
        ({
          pattern,
          replacement,
          context_keywords,
          negative_keywords,
          window_size,
        }) => ({
          pattern,
          replacement,
          context_keywords,
          negative_keywords,
          window_size,
        }),
      ),
    };

    await writeFile(
      DICTIONARY_PATH,
      JSON.stringify(saveData, null, 2),
      "utf-8",
    );
  } catch (error) {
    console.error("Failed to save dictionary:", error);
    throw error;
  }
}

// Convert dictionary data to unified entry list
export function toEntryList(data: DictionaryData): DictionaryEntry[] {
  const entries: DictionaryEntry[] = [];

  // Simple replacements
  for (const [pattern, replacement] of Object.entries(data.simple)) {
    entries.push({
      id: `simple-${pattern}`,
      type: "simple",
      pattern,
      replacement,
    });
  }

  // Replacement rules
  for (const rule of data.replacements) {
    entries.push({
      id: rule.id,
      type: "replacement",
      pattern: rule.pattern,
      replacement: rule.replacement,
      is_regex: rule.is_regex,
    });
  }

  // Context rules
  for (const rule of data.context_rules) {
    entries.push({
      id: rule.id,
      type: "context",
      pattern: rule.pattern,
      replacement: rule.replacement,
      context_keywords: rule.context_keywords,
      negative_keywords: rule.negative_keywords,
      window_size: rule.window_size,
    });
  }

  return entries;
}

// Add a simple replacement
export async function addSimpleEntry(
  pattern: string,
  replacement: string,
): Promise<DictionaryData> {
  const data = await loadDictionary();
  data.simple[pattern] = replacement;
  await saveDictionary(data);
  return data;
}

// Add a replacement rule
export async function addReplacementRule(
  pattern: string,
  replacement: string,
  is_regex: boolean,
): Promise<DictionaryData> {
  const data = await loadDictionary();
  data.replacements.push({
    id: generateId(),
    pattern,
    replacement,
    is_regex,
  });
  await saveDictionary(data);
  return data;
}

// Add a context rule
export async function addContextRule(
  pattern: string,
  replacement: string,
  context_keywords: string[],
  negative_keywords: string[],
  window_size: number,
): Promise<DictionaryData> {
  const data = await loadDictionary();
  data.context_rules.push({
    id: generateId(),
    pattern,
    replacement,
    context_keywords,
    negative_keywords,
    window_size,
  });
  await saveDictionary(data);
  return data;
}

// Update an entry
export async function updateEntry(
  entry: DictionaryEntry,
): Promise<DictionaryData> {
  const data = await loadDictionary();

  switch (entry.type) {
    case "simple": {
      // Remove old key if pattern changed
      const oldKey = entry.id.replace("simple-", "");
      if (oldKey !== entry.pattern && data.simple[oldKey]) {
        delete data.simple[oldKey];
      }
      data.simple[entry.pattern] = entry.replacement;
      break;
    }
    case "replacement": {
      const index = data.replacements.findIndex((r) => r.id === entry.id);
      if (index >= 0) {
        data.replacements[index] = {
          id: entry.id,
          pattern: entry.pattern,
          replacement: entry.replacement,
          is_regex: entry.is_regex || false,
        };
      }
      break;
    }
    case "context": {
      const index = data.context_rules.findIndex((r) => r.id === entry.id);
      if (index >= 0) {
        data.context_rules[index] = {
          id: entry.id,
          pattern: entry.pattern,
          replacement: entry.replacement,
          context_keywords: entry.context_keywords || [],
          negative_keywords: entry.negative_keywords || [],
          window_size: entry.window_size || 50,
        };
      }
      break;
    }
  }

  await saveDictionary(data);
  return data;
}

// Delete an entry
export async function deleteEntry(
  entry: DictionaryEntry,
): Promise<DictionaryData> {
  const data = await loadDictionary();

  switch (entry.type) {
    case "simple": {
      delete data.simple[entry.pattern];
      break;
    }
    case "replacement": {
      data.replacements = data.replacements.filter((r) => r.id !== entry.id);
      break;
    }
    case "context": {
      data.context_rules = data.context_rules.filter((r) => r.id !== entry.id);
      break;
    }
  }

  await saveDictionary(data);
  return data;
}

// Get type display name
export function getTypeDisplayName(type: DictionaryEntryType): string {
  switch (type) {
    case "simple":
      return "Simple";
    case "replacement":
      return "Replacement";
    case "context":
      return "Context";
  }
}

// Get type icon
export function getTypeIcon(type: DictionaryEntryType): string {
  switch (type) {
    case "simple":
      return "text-cursor";
    case "replacement":
      return "wand-16";
    case "context":
      return "doc-on-clipboard";
  }
}
