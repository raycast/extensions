import { getPreferenceValues, showToast, Toast, open, popToRoot, closeMainWindow } from "@raycast/api";
import { URLSearchParams } from "url";

interface RaySoPrompt {
  creativity: string;
  highlightEdits: boolean;
  title: string;
  model: string;
  icon: string;
  prompt: string;
}

const extractWithRegex = (html: string, regex: RegExp): string => {
  const match = html.match(regex);
  return match?.[1]?.trim() ?? "";
};

export default async function Command(props: { arguments: Arguments.ImportDiaSkill }) {
  const { skillUrl } = props.arguments;

  if (!skillUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing URL",
      message: "Please provide a valid Dia skill URL",
    });
    return;
  }

  if (!skillUrl.startsWith("https://www.diabrowser.com/skills/")) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
      message: "Please provide a valid URL from diabrowser.com/skills",
    });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Importing Skill..." });

  try {
    const response = await fetch(skillUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();

    // Extract shortcut name - look for the main heading or title
    let shortcutName = extractWithRegex(html, /<h1[^>]*>([^<]+)<\/h1>/);
    if (!shortcutName) {
      // Try title tag and remove site name
      const titleText = extractWithRegex(html, /<title>([^<]+)<\/title>/);
      if (titleText) {
        shortcutName = titleText.split(" | ")[0].trim();
      }
    }
    if (!shortcutName) {
      // Fallback to meta property
      shortcutName = extractWithRegex(html, /<meta property="og:title" content="([^"]+)"/);
    }

    if (!shortcutName) {
      throw new Error("Could not find skill name.");
    }

    // Extract prompt - get everything from the rich text content area
    let promptText = "";

    // Look for the rich text div that contains the prompt
    const richTextMatch = html.match(
      /<div class="bg-fill-tertiary rounded-8 p-12"><div class="rich-text[^"]*"[^>]*>([\s\S]*?)<\/div><\/div>/,
    );
    if (richTextMatch && richTextMatch[1]) {
      // Extract text content from the HTML, removing tags but preserving structure
      promptText = richTextMatch[1]
        .replace(/<\/p>/g, "\n\n") // Convert paragraph breaks to line breaks
        .replace(/<\/li>/g, "\n") // Convert list items to line breaks
        .replace(/<[^>]*>/g, "") // Remove all HTML tags
        .replace(/&lt;/g, "<") // Decode HTML entities
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up multiple line breaks
        .trim();
    }

    if (!promptText) {
      // Fallback to textarea or other patterns
      promptText = extractWithRegex(html, /<textarea[^>]*>([\s\S]*?)<\/textarea>/);
    }

    if (!promptText) {
      // Final fallback to meta description
      const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);
      if (descriptionMatch && descriptionMatch[1]) {
        promptText = descriptionMatch[1];
      } else {
        throw new Error("Could not find prompt text.");
      }
    }

    // Add the browser instruction prefix to the prompt
    promptText =
      "@browser find relevant tabs and get their content (only if necessary) for the following:\n\n" + promptText;

    // Clean up the prompt text - decode HTML entities and normalize whitespace
    promptText = promptText
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .trim();

    // Construct the ray.so URL
    const preferences = getPreferenceValues<Record<string, string>>();

    const raySoData: RaySoPrompt = {
      title: shortcutName,
      prompt: promptText,
      model: preferences.model || "raycast-ray1",
      icon: preferences.icon || "link",
      creativity: preferences.creativity || "medium",
      highlightEdits: false,
    };

    const params = new URLSearchParams({ prompts: JSON.stringify(raySoData) });
    const raySoUrl = `https://ray.so/prompts/shared?${params.toString()}`;

    await open(raySoUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Successfully Imported Skill",
      message: `Opened "${shortcutName}" in ray.so`,
    });

    await closeMainWindow();
    await popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Import Skill",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
