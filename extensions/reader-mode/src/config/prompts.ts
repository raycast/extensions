import { AI, environment } from "@raycast/api";
import { SummaryStyle, SupportedLanguage, TranslationOptions } from "../types/summary";
import { getCachedTitle, setCachedTitle } from "../utils/summaryCache";

/**
 * Prompt for rewriting article titles
 */
const TITLE_REWRITE_PROMPT = `Rewrite this article title to be concise and easy-to-read.

Rules:
- Keep it short and clear
- Preserve the core meaning
- Remove unnecessary words, filler, or clickbait
- Do not add quotes around the title
- Output ONLY the rewritten title, nothing else

Original title: `;

/**
 * Rewrite an article title using AI
 * Returns the original title if AI is unavailable or on error
 */
export async function rewriteArticleTitle(originalTitle: string, url: string): Promise<string> {
  if (!environment.canAccess(AI)) {
    return originalTitle;
  }

  const cached = await getCachedTitle(url);
  if (cached) {
    return cached;
  }

  try {
    const rewritten = await AI.ask(TITLE_REWRITE_PROMPT + originalTitle, {
      model: AI.Model["OpenAI_GPT-5.1_Instant"],
      creativity: "low",
    });

    const cleanTitle = rewritten.trim();
    if (cleanTitle) {
      await setCachedTitle(url, cleanTitle);
      return cleanTitle;
    }
    return originalTitle;
  } catch {
    return originalTitle;
  }
}

/**
 * Language names for output language instruction
 */
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  "en-US": "English",
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

/**
 * Get language instruction suffix for non-English languages
 */
function getLanguageInstruction(language?: SupportedLanguage): string {
  if (!language || language === "en-US") return "";
  const langName = LANGUAGE_NAMES[language] || language;
  return `\n\nOutput your response in ${langName}.`;
}

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
    buildPrompt: (context, options) => `${context}

Summarize this article with:
1. A single one-liner summary (one sentence capturing the main point)
2. Three bullet points highlighting the key information

Format your response EXACTLY like this:
One-liner summary here.

- First key point
- Second key point
- Third key point${getLanguageInstruction(options?.language)}`,
  },

  "at-a-glance": {
    label: "At a Glance",
    buildPrompt: (context, options) => `${context}
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

Format your response EXACTLY as bullet points with clear, specific information. Each bullet point MUST start with a **bold lead-in phrase** followed by a colon, then the explanation (e.g., "**Key finding:** The details..."). Start immediately with bullet points - do not include any introductory text or paragraphs. Provide 4-7 key points, but no less than three. Don't summarize what's already covered by the webpage title.${getLanguageInstruction(options?.language)}`,
  },

  "opposite-sides": {
    label: "Opposing Sides",
    buildPrompt: (context, options) => `${context}

Analyze this article and present two contrasting viewpoints or perspectives that emerge from or relate to the content. If the article itself presents opposing views, summarize them. If not, identify the main argument and present a reasonable counterargument.

Format your response EXACTLY like this:
**Perspective A:** [first viewpoint summary]

**Perspective B:** [contrasting viewpoint summary]${getLanguageInstruction(options?.language)}`,
  },

  "five-ws": {
    label: "The 5 Ws",
    buildPrompt: (context, options) => `${context}

Summarize this article using the 5 Ws framework. Extract the key information for each category. If any category is not applicable or not mentioned, indicate "Not specified."

Format your response EXACTLY like this:
- **Who:** [who is involved]
- **What:** [what happened or is being discussed]
- **Where:** [where it takes place]
- **When:** [when it happened or is happening]
- **Why:** [why it matters or the reason behind it]${getLanguageInstruction(options?.language)}`,
  },

  eli5: {
    label: "Explain Like I'm 5",
    buildPrompt: (context, options) => `${context}

Explain this article in very simple terms that a 5-year-old could understand. Use simple words, short sentences, and relatable analogies. Avoid jargon and technical terms.

Format your response as a simple, friendly explanation in 2-3 short paragraphs.${getLanguageInstruction(options?.language)}`,
  },

  entities: {
    label: "People, Places & Things",
    buildPrompt: (context, options) => `${context}

Extract and list the key entities (people, places, and things) mentioned in this article. For each entity, provide brief context about their relevance to the article.

Format your response EXACTLY like this:
**People:**
- **[Name]:** [brief context]

**Places:**
- **[Location]:** [brief context]

**Things:**
- **[Entity]:** [brief context]

If a category has no relevant entities, you may omit it.${getLanguageInstruction(options?.language)}`,
  },

  comprehensive: {
    label: "Comprehensive",
    buildPrompt: (context, options) => `${context}

Summarize this article with the following format:
[one to two sentence summary with the most important information]

### Key Takeaways

- [key takeaway 1]
- [key takeaway 2]
- [key takeaway 3]

Rules:
- ALWAYS capture the tone, perspective, and POV of the author
- NEVER add information not present in the article
- Keep bullet points as short as possible
- Provide EXACTLY three key takeaways${getLanguageInstruction(options?.language)}`,
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
