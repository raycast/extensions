import fs from "fs";
import { MdDefinition } from "../types";
import { executeWordCliWithStatusUpdate, executeWordCli } from "./cliManager";

export function parseRawMdDefinition(output: string, text: string): MdDefinition | null {
  try {
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    let pronunciation = "";
    let definition = "";
    let chinese = "";
    let example_en = "";
    let example_zh = "";
    let tip = "";
    let timestamp = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Pronunciation: */pronunciation/*
      if (line.match(/^\*\/.*\/\*$/)) {
        pronunciation = line.replace(/^\*\//, "").replace(/\/\*$/, "");
      }

      // Definition: > Definition text
      else if (line.startsWith("> ")) {
        definition = line.replace(/^> /, "");
      }

      // Chinese: **Chinese text**
      else if (line.match(/^\*\*.*\*\*$/)) {
        chinese = line.replace(/^\*\*/, "").replace(/\*\*$/, "");
      }

      // Examples: - Example text
      else if (line.startsWith("- ")) {
        const exampleText = line.replace(/^- /, "");
        if (!/[\u4e00-\u9fa5]/.test(exampleText) && !example_en) {
          example_en = exampleText;
        } else if (/[\u4e00-\u9fa5]/.test(exampleText) && !example_zh) {
          example_zh = exampleText;
        }
      }

      // Tip: *Tip text* (but not pronunciation format)
      else if (line.match(/^\*.*\*$/) && !line.match(/^\*\/.*\/\*$/)) {
        tip = line.replace(/^\*/, "").replace(/\*$/, "");
      } else if (line.match(/<!--.*-->/)) {
        const metadata = line.replace("<!--", "").replace("-->", "").trim().split(" ");

        for (let j = 0; j < metadata.length; j++) {
          const split = metadata[j].split("=");
          if (split[0] === "timestamp") {
            timestamp = split[1];
          }
        }
      }
    }

    return {
      text: text,
      pronunciation: pronunciation || "",
      definition: definition || "",
      chinese: chinese || "",
      example_en: example_en || "",
      example_zh: example_zh || "",
      tip: tip || "",
      raw_output: output,
      timestamp: timestamp,
    };
  } catch (error) {
    console.error("Error parsing raw md definition:", error);
    return null;
  }
}

export async function getMdDefinitionExplanation(text: string): Promise<MdDefinition | null> {
  try {
    const output = await executeWordCli(["query", text, "--raw"]);
    return parseRawMdDefinition(output, text);
  } catch (error) {
    console.error("Error getting md definition explanation:", error);
    return null;
  }
}

export async function saveMdDefinitionToVocabulary(
  content: string,
  onStatusUpdate?: (message: string) => void,
): Promise<boolean> {
  try {
    const result = await executeWordCliWithStatusUpdate(["save", content], { onStatusUpdate });

    if (!result) {
      console.error(`Save failed for content`, content);
    }

    return result;
  } catch (error) {
    console.error("Error in saveMdDefinitionToVocabulary:", error);
    return false;
  }
}

export async function deleteMdDefinitionFromVocabulary(
  timestamp: string,
  onStatusUpdate?: (message: string) => void,
): Promise<boolean> {
  try {
    const result = await executeWordCliWithStatusUpdate(["delete", timestamp], { onStatusUpdate });

    if (!result) {
      console.error(`Delete failed for timestamp: ${timestamp}`);
    }

    return result;
  } catch (error) {
    console.error("Error in deleteMdDefinitionFromVocabulary:", error);
    return false;
  }
}

export async function updateMdDefinitionInVocabulary(
  timestamp: string,
  content: string,
  onStatusUpdate?: (message: string) => void,
): Promise<boolean> {
  try {
    const result = await executeWordCliWithStatusUpdate(["update", timestamp, "--content", content], {
      onStatusUpdate,
    });

    if (!result) {
      console.error(`Update failed for timestamp: ${timestamp}`);
    }

    return result;
  } catch (error) {
    console.error("Error in updateMdDefinitionInVocabulary:", error);
    return false;
  }
}

// Parse saved md definitions from the vocabulary notebook
export function parseSavedMdDefinitions(vocabularyPath: string): MdDefinition[] {
  try {
    if (!fs.existsSync(vocabularyPath)) {
      return [];
    }

    const content = fs.readFileSync(vocabularyPath, "utf8");
    const mdDefinitions: MdDefinition[] = [];

    // Split content by md definition sections (## text)
    const sections = content.split("\n---\n");

    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.split("\n");
      const textLine = lines[0];
      const textMatch = textLine.match(/^## (.+)$/);

      if (!textMatch) continue;

      const text = textMatch[1].trim();
      const textContent = lines.slice(1).join("\n");

      // Parse the text content similar to the original parser
      const parsed = parseRawMdDefinition(textContent, text);
      if (parsed) {
        mdDefinitions.push({
          ...parsed,
        });
      }
    }

    return mdDefinitions;
  } catch (error) {
    console.error("Error parsing saved md definitions:", error);
    return [];
  }
}
