import { SummaryStyle, TranslationOptions } from "../types/summary";

/**
 * Prompt configuration for each summary style
 */
interface PromptConfig {
  label: string;
  buildPrompt: (context: string, options?: TranslationOptions) => string;
}

/**
 * Build the base context string for prompts
 */
export function buildBaseContext(title: string, content: string): string {
  return `Article Title: "${title}"\n\nArticle Content:\n${content}`;
}

/**
 * Summary prompts configuration
 * Each style has a label and a function to build the prompt
 */
export const SUMMARY_PROMPTS: Record<SummaryStyle, PromptConfig> = {
  overview: {
    label: "Overview",
    buildPrompt: (context) => `${context}

Summarize this article with:
1. A single one-liner summary (one sentence capturing the main point)
2. Three bullet points highlighting the key information

Format your response EXACTLY like this:
[one-liner summary]

- [key point 1]
- [key point 2]
- [key point 3]`,
  },

  "arc-style": {
    label: "Arc-style Summary",
    buildPrompt: (context) => `${context}
The reader opened a webpage that's too long for them to read right now.

You will:
1. Read the webpage info provided above.
2. Write bullet points providing the most important information and details that they most likely want to know about right now.

For any given page, write at least three bullet points, but try to write more if you can.
Write the summary from the point of view of the author of the webpage and capture the tone and perspective of the author.
Your summary should be fact-filled and SPECIFIC, providing information like prices, review sentiment, dates, addresses, times, instructions, ingredients, top news stories, amounts, timelines, characters, answers, features, comparisons, shipping times.
Admit when you're unsure or don't know how to summarize, and never make a statement without providing a fact or instance to back it up.
Do NOT repeat text or concepts in your summary.
If the webpage is for a recipe, first describe the style and type of dish this is and then provide exact steps for the preparation and cooking instructions. List all ingredients including exact measurements and amounts. Also note number of servings and cooking or preparation times.
If the page is for a restaurant, write a brief description of why it is notable, write a list of what's on the menu and provide opening times, addresses, and contact details.

Format your response EXACTLY as bullet points with clear, specific information. Start immediately with bullet points - do not include any introductory text or paragraphs. Provide 4-7 key points, but no less than three. Don't summarize what's already covered by the webpage title.`,
  },

  "opposite-sides": {
    label: "Opposing Sides",
    buildPrompt: (context) => `${context}

Analyze this article and present two contrasting viewpoints or perspectives that emerge from or relate to the content. If the article itself presents opposing views, summarize them. If not, identify the main argument and present a reasonable counterargument.

Format your response EXACTLY like this:
**Perspective A:** [first viewpoint summary]

**Perspective B:** [contrasting viewpoint summary]`,
  },

  "five-ws": {
    label: "The 5 Ws",
    buildPrompt: (context) => `${context}

Summarize this article using the 5 Ws framework. Extract the key information for each category. If any category is not applicable or not mentioned, indicate "Not specified."

Format your response EXACTLY like this:
- **Who:** [who is involved]
- **What:** [what happened or is being discussed]
- **Where:** [where it takes place]
- **When:** [when it happened or is happening]
- **Why:** [why it matters or the reason behind it]`,
  },

  eli5: {
    label: "Explain Like I'm 5",
    buildPrompt: (context) => `${context}

Explain this article in very simple terms that a 5-year-old could understand. Use simple words, short sentences, and relatable analogies. Avoid jargon and technical terms.

Format your response as a simple, friendly explanation in 2-3 short paragraphs.`,
  },

  translated: {
    label: "Translated Overview",
    buildPrompt: (context, options) => {
      const LANGUAGE_NAMES: Record<string, string> = {
        "es-ES": "Spanish",
        "fr-FR": "French",
        "de-DE": "German",
        "it-IT": "Italian",
        "pt-BR": "Portuguese",
        "ja-JP": "Japanese",
        "zh-Hans": "Chinese (Simplified)",
        "zh-Hant": "Chinese (Traditional)",
        "ko-KR": "Korean",
        "ru-RU": "Russian",
        "ar-SA": "Arabic",
        "hi-IN": "Hindi",
        "nl-NL": "Dutch",
        "pl-PL": "Polish",
        "sv-SE": "Swedish",
        "tr-TR": "Turkish",
        "vi-VN": "Vietnamese",
        "th-TH": "Thai",
        "el-GR": "Greek",
        "he-IL": "Hebrew",
      };
      const lang = options?.language ? LANGUAGE_NAMES[options.language] || options.language : "Spanish";
      const level = options?.level || "intermediate";
      return `${context}

Provide an overview summary of this article translated into ${lang} at a ${level} language level.

Format your response EXACTLY like this:
** [one-liner summary in ${lang}]

- [key point 1 in ${lang}]
- [key point 2 in ${lang}]
- [key point 3 in ${lang}]`;
    },
  },

  entities: {
    label: "People, Places & Things",
    buildPrompt: (context) => `${context}

Extract and list the key entities (people, places, and things) mentioned in this article. For each entity, provide brief context about their relevance to the article.

Format your response EXACTLY like this:
**People:**
- **[Name]:** [brief context]

**Places:**
- **[Location]:** [brief context]

**Things:**
- **[Entity]:** [brief context]

If a category has no relevant entities, you may omit it.`,
  },
};

/**
 * Default/fallback prompt for unknown styles
 */
export const DEFAULT_PROMPT = {
  label: "Summary",
  buildPrompt: (context: string) => `${context}

Summarize this article concisely.`,
};

/**
 * Get prompt config for a style, with fallback to default
 */
export function getPromptConfig(style: SummaryStyle): PromptConfig {
  return SUMMARY_PROMPTS[style] ?? DEFAULT_PROMPT;
}

/**
 * Get the label for a summary style
 */
export function getStyleLabel(style: SummaryStyle): string {
  return getPromptConfig(style).label;
}

/**
 * Build the full prompt for a given style
 */
export function buildPromptForStyle(
  style: SummaryStyle,
  title: string,
  content: string,
  translationOptions?: TranslationOptions,
): string {
  const context = buildBaseContext(title, content);
  const config = getPromptConfig(style);
  return config.buildPrompt(context, translationOptions);
}
