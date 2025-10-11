import { readFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import { Prompt } from "../types";
import { categorizePrompt } from "./categorize";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function loadPrompts(): Prompt[] {
  try {
    // Use Raycast's assetsPath to locate the CSV file
    const csvPath = join(environment.assetsPath, "data/prompt_library.csv");
    const csvContent = readFileSync(csvPath, "utf-8");

    // Remove BOM if present
    const cleanContent = csvContent.replace(/^\uFEFF/, "");
    const lines = cleanContent.split("\n");

    const prompts: Prompt[] = [];
    let currentRow: string[] = [];
    let inMultilineField = false;

    // Skip header (first line)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      if (!inMultilineField) {
        // Start of a new row
        currentRow = [];
        const openQuotes = (line.match(/"/g) || []).length;

        if (openQuotes % 2 === 0) {
          // Complete row on single line
          const fields = parseCSVLine(line);
          if (fields.length >= 2 && fields[0]) {
            prompts.push({
              id: `prompt-${prompts.length + 1}`,
              name: fields[0].replace(/^"|"$/g, "").trim(),
              prompt: fields[1].replace(/^"|"$/g, "").trim(),
              category: categorizePrompt(fields[0], fields[1]),
            });
          }
        } else {
          // Start of multiline field
          currentRow.push(line);
          inMultilineField = true;
        }
      } else {
        // Continuation of multiline field
        currentRow.push(line);
        const combinedRow = currentRow.join("\n");
        const openQuotes = (combinedRow.match(/"/g) || []).length;

        if (openQuotes % 2 === 0) {
          // End of multiline field
          const fields = parseCSVLine(combinedRow);
          if (fields.length >= 2 && fields[0]) {
            prompts.push({
              id: `prompt-${prompts.length + 1}`,
              name: fields[0].replace(/^"|"$/g, "").trim(),
              prompt: fields[1].replace(/^"|"$/g, "").trim(),
              category: categorizePrompt(fields[0], fields[1]),
            });
          }
          inMultilineField = false;
          currentRow = [];
        }
      }
    }

    console.log(`Loaded ${prompts.length} prompts from CSV`);
    return prompts;
  } catch (error) {
    console.error("Error loading prompts:", error);
    return [];
  }
}
