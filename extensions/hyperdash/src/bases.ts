import fs from "fs/promises";
import YAML from "yaml";

export async function readBasesTag(filePath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const doc = YAML.parse(raw) as any;

    // Try filters.or first (for containsAny)
    const orList: any[] | undefined = doc?.filters?.or;
    if (Array.isArray(orList)) {
      for (const item of orList) {
        if (typeof item === "string") {
          // Match tags.containsAny("ja/todo", "ae/todo") and extract ALL tags
          const anyMatch = item.match(/tags\.containsAny\((.*?)\)/i);
          if (anyMatch?.[1]) {
            // Extract all quoted strings from the containsAny arguments
            const tags = anyMatch[1].match(/["']([^"']+)["']/g);
            if (tags && tags.length > 0) {
              // Remove quotes and join with comma
              const tagList = tags.map(t => t.replace(/["']/g, '').trim().toLowerCase()).join(', ');
              return tagList;
            }
          }

          // Also try regular contains
          const m = item.match(/tags\.contains\(["'](.+?)["']\)/i);
          if (m?.[1]) return m[1].trim().toLowerCase();
        }
      }
    }

    // Fallback to filters.and
    const andList: any[] | undefined = doc?.filters?.and;
    if (Array.isArray(andList)) {
      for (const item of andList) {
        if (typeof item === "string") {
          const m = item.match(/tags\.contains\(["'](.+?)["']\)/i);
          if (m?.[1]) return m[1].trim().toLowerCase();
        }
      }
    }
  } catch {
    // ignore parse/read errors
  }
  return undefined;
}
