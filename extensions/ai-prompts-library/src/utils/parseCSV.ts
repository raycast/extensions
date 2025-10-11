import { readFileSync } from "fs";
import { join } from "path";
import { Prompt } from "../types";
import { categorizePrompt } from "./categorize";

export function parsePromptsCSV(): Prompt[] {
  const csvPath = join(__dirname, "../../prompt_library.csv");
  const csvContent = readFileSync(csvPath, "utf-8");

  const prompts: Prompt[] = [];
  const lines = csvContent.split("\n");

  let currentName = "";
  let currentPrompt = "";
  let inPrompt = false;
  let lineIndex = 0;

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts with a quote (beginning of a new entry)
    if (line.match(/^"?[^",]+",/) && !inPrompt) {
      // Save previous entry if exists
      if (currentName && currentPrompt) {
        prompts.push({
          id: `prompt-${lineIndex}`,
          name: currentName.replace(/^"|"$/g, "").trim(),
          prompt: currentPrompt.replace(/^"|"$/g, "").trim(),
          category: categorizePrompt(currentName, currentPrompt),
        });
        lineIndex++;
      }

      // Parse new entry
      const match = line.match(/^"?([^"]+?)"?,"?(.*)$/);
      if (match) {
        currentName = match[1].trim();
        currentPrompt = match[2];

        // Check if prompt ends on same line (no opening quote or has closing quote)
        if (!currentPrompt.startsWith('"') || currentPrompt.endsWith('"')) {
          inPrompt = false;
        } else {
          inPrompt = true;
        }
      }
    } else if (inPrompt) {
      // Continue multi-line prompt
      currentPrompt += "\n" + line;

      // Check if this line ends the prompt
      if (line.endsWith('"')) {
        inPrompt = false;
      }
    }
  }

  // Add last entry
  if (currentName && currentPrompt) {
    prompts.push({
      id: `prompt-${lineIndex}`,
      name: currentName.replace(/^"|"$/g, "").trim(),
      prompt: currentPrompt.replace(/^"|"$/g, "").trim(),
      category: categorizePrompt(currentName, currentPrompt),
    });
  }

  return prompts;
}
