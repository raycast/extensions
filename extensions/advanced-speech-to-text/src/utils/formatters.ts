import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, ErrorTypes } from "../types";
import { handleOpenAIError } from "./errors";

const DEFAULT_FORMATTING_PROMPTS = {
  email: `Transform the following text into a well-structured email, maintaining the original language of the input text. 
Analyze the tone and style of the input text (casual, professional, cordial, informal, etc.) and maintain that same tone throughout. 
Add an appropriate greeting like "Hi," and closing like "Cheers," that matches the detected tone. Do not use placeholders like [name] or [signature]. 
Organize the information in clear paragraphs. Only return the email text, without subject.

Text to format:`,

  slack: `Clean up and format the following transcription maintaining the original language, tone, style and words. 
Only fix small inconsistencies, errors, and organize the text into proper paragraphs with correct punctuation. 
Do not add emojis, greetings, or closings. Do not change the conversational style or add formalities.
Simply present the cleaned transcription with proper formatting.

Text to format:`,

  report: `Transform the following text into a structured report for a task management system, maintaining the original language of the input text. 
Organize the information with:
- **Objective/Task:** [clear description of what needs to be done]
- **Details:** [specific information and steps if any]
- **Requirements:** [if applicable, what is needed to complete the task]

Maintain a clear, professional and action-oriented format.

Text to format:`,
};

function getFormattingPrompt(mode: "email" | "slack" | "report"): string {
  const preferences = getPreferenceValues<Preferences>();

  switch (mode) {
    case "email":
      return preferences.customPromptEmail || DEFAULT_FORMATTING_PROMPTS.email;
    case "slack":
      return preferences.customPromptSlack || DEFAULT_FORMATTING_PROMPTS.slack;
    case "report":
      return (
        preferences.customPromptReport || DEFAULT_FORMATTING_PROMPTS.report
      );
    default:
      return DEFAULT_FORMATTING_PROMPTS[mode];
  }
}

function sanitizeText(text: string): string {
  // Remove any newlines and normalize spaces
  const sanitized = text.replace(/[\r\n]+/g, " ").trim();
  // Escape any quotes that could break the prompt structure
  return sanitized.replace(/"/g, '\\"');
}

export async function formatTextWithChatGPT(
  text: string,
  mode: "email" | "slack" | "report",
): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const prompt = getFormattingPrompt(mode);
  const sanitizedText = sanitizeText(text);

  if (!preferences.openaiApiKey) {
    throw new Error(ErrorTypes.API_KEY_MISSING);
  }

  const openai = new OpenAI({
    apiKey: preferences.openaiApiKey,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n"${sanitizedText}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error("Error formatting text:", error);
    handleOpenAIError(error);
  }
}
