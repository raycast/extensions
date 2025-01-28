import { getPreferenceValues, showHUD } from "@raycast/api";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import TurndownService from "turndown";
import { htmlToText } from "html-to-text";
import { prompts } from "./prompts";
import { AI_MODELS } from "./constants";

interface Preferences {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  preferredAiProvider: "openai" | "anthropic";
}

const formatWithAI = async (text: string, promptType: keyof typeof prompts): Promise<string> => {
  const preferences = getPreferenceValues<Preferences>();

  // If no AI is configured, return early
  if (
    !(
      (preferences.preferredAiProvider === "openai" && preferences.openaiApiKey) ||
      (preferences.preferredAiProvider === "anthropic" && preferences.anthropicApiKey)
    )
  ) {
    return text;
  }

  await showHUD("Processing with AI...");
  try {
    if (preferences.preferredAiProvider === "openai" && preferences.openaiApiKey) {
      const openai = getAiClient() as OpenAI;
      const response = await openai.chat.completions.create({
        model: AI_MODELS.openai.model,
        max_tokens: AI_MODELS.openai.maxTokens,
        temperature: AI_MODELS.openai.temperature,
        messages: [
          ...(prompts[promptType].system
            ? [
                {
                  role: "system" as const,
                  content: prompts[promptType].system,
                },
              ]
            : []),
          {
            role: "user" as const,
            content: prompts[promptType].user.replace("{text}", text),
          },
        ],
      });
      return response.choices[0]?.message?.content || text;
    } else if (preferences.preferredAiProvider === "anthropic" && preferences.anthropicApiKey) {
      const anthropic = getAiClient() as Anthropic;
      const response = await anthropic.messages.create({
        model: AI_MODELS.anthropic.model,
        max_tokens: AI_MODELS.anthropic.maxTokens,
        temperature: AI_MODELS.anthropic.temperature,
        messages: [
          {
            role: "user",
            content: prompts[promptType].user.replace("{text}", text),
          },
        ],
      });
      return response.content[0]?.text || text;
    }
  } catch (error) {
    console.error("AI formatting failed:", error);
    throw error;
  }

  return text;
};

export const cleanText = (text: string): string => {
  // Remove extra whitespace and normalize line endings
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Normalize multiple line breaks
    .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""); // Trim whitespace
};

export const convertToMarkdown = async (text: string): Promise<string> => {
  // First clean and convert to basic markdown
  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  let markdownText: string;
  try {
    markdownText = cleanText(turndownService.turndown(text));
  } catch {
    markdownText = cleanText(text);
  }

  // Try to enhance with AI
  try {
    return await formatWithAI(markdownText, "markdown");
  } catch (error) {
    console.error("AI formatting failed:", error);
    return markdownText; // Fall back to basic conversion
  }
};

export const convertToHtml = async (text: string): Promise<string> => {
  // First do basic HTML conversion
  let htmlText: string;
  if (/<[a-z][\s\S]*>/i.test(text)) {
    htmlText = cleanText(text);
  } else {
    // Convert markdown to HTML
    htmlText = text
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/\n/gim, "<br>");
  }

  // Try to enhance with AI
  try {
    return await formatWithAI(htmlText, "html");
  } catch (error) {
    console.error("AI formatting failed:", error);
    return htmlText; // Fall back to basic conversion
  }
};

export const stripHtml = async (text: string): Promise<string> => {
  // First do basic HTML stripping
  const cleanedText = htmlToText(text, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });

  // Try to enhance with AI
  try {
    return await formatWithAI(cleanedText, "clean");
  } catch (error) {
    console.error("AI formatting failed:", error);
    return cleanedText; // Fall back to basic conversion
  }
};

export const getAiClient = () => {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.preferredAiProvider === "openai" && preferences.openaiApiKey) {
    return new OpenAI({ apiKey: preferences.openaiApiKey });
  } else if (preferences.preferredAiProvider === "anthropic" && preferences.anthropicApiKey) {
    return new Anthropic({ apiKey: preferences.anthropicApiKey });
  }

  throw new Error("No AI provider configured. Please set up your API key in preferences.");
};
