import { AI } from "@raycast/api";
import type { Platform, ExtractedKey } from "./types";

interface ExtractKeysFromImageArgs {
  imageUrl: string;
  platform?: Platform;
  context?: string;
}

/**
 * AI Tool: Extract translation keys from a design screenshot or image
 * This tool processes images (Figma screenshots, UI mockups, etc.) and extracts
 * all translatable text, suggesting appropriate translation key names.
 */
export default async function ExtractKeysFromImage(args: ExtractKeysFromImageArgs) {
  try {
    const { platform = "web", context } = args;

    // Note: imageUrl is provided by Raycast AI but not used directly in the prompt
    // The image is attached to the AI conversation context automatically
    const prompt = `You are a localization expert analyzing a design file or screenshot to extract translation keys.

Platform: ${platform}
${context ? `Context: ${context}` : ""}

Please analyze the attached image and:
1. Identify all text elements that should be localized (UI labels, buttons, titles, messages, etc.)
2. Suggest appropriate translation key names following the pattern: category.component.element (e.g., "common.button.save", "home.title.welcome")
3. Extract the exact text that needs to be translated
4. Provide a brief description of where/how the text is used

Return your response as a JSON array with this structure:
[
  {
    "keyName": "suggested.key.name",
    "translationValue": "The actual text from the design",
    "description": "Brief description of usage context"
  }
]

IMPORTANT: Only include text that should be translated. Exclude:
- Placeholder/example data (like names, emails, dates)
- Numbers and measurements
- Code or technical identifiers
- Icons and images (unless they contain text)
- Lorem ipsum or dummy text

Return ONLY the JSON array, no additional text or markdown formatting.`;

    const response = await AI.ask(prompt, {
      creativity: "low", // Use low creativity for more consistent, structured output
      model: AI.Model["OpenAI_GPT-4o"],
    });

    // Parse the AI response
    let keys: ExtractedKey[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in AI response");
      }
      keys = JSON.parse(jsonMatch[0]);

      // Validate keys
      if (!Array.isArray(keys) || keys.length === 0) {
        return {
          success: true,
          message: "No translatable text found in the image",
          keys: [],
        };
      }

      // Filter out invalid keys
      keys = keys.filter((key) => {
        return (
          key.keyName &&
          typeof key.keyName === "string" &&
          key.translationValue &&
          typeof key.translationValue === "string" &&
          key.keyName.trim().length > 0 &&
          key.translationValue.trim().length > 0
        );
      });

      // Remove duplicates by key name
      const uniqueKeys = new Map<string, ExtractedKey>();
      keys.forEach((key) => {
        if (!uniqueKeys.has(key.keyName)) {
          uniqueKeys.set(key.keyName, key);
        }
      });
      keys = Array.from(uniqueKeys.values());
    } catch {
      console.error("Failed to parse AI response:", response);
      return {
        success: false,
        error: "Failed to parse AI response. The image may not contain clear text or the format was unexpected.",
      };
    }

    return {
      success: true,
      message: `Successfully extracted ${keys.length} translation key${keys.length !== 1 ? "s" : ""} from the image`,
      platform,
      keys: keys.map((key) => ({
        keyName: key.keyName,
        translationValue: key.translationValue,
        description: key.description || undefined,
        platform,
      })),
      instructions: `Review the extracted keys above. To add them to Lokalise, use the 'add-translation-key' tool for each key you want to add. You can add them individually or ask the user which ones they want to add.`,
    };
  } catch (error) {
    console.error("Error extracting keys from image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract translation keys from image",
    };
  }
}
