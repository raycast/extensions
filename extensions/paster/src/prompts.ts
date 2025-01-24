export interface Prompt {
  system?: string;
  user: string;
}

export const prompts = {
  markdown: {
    system:
      "You are a Markdown formatting specialist. Your sole task is to enhance the visual structure and readability of text using Markdown syntax, while strictly preserving the original content and language. Format text elements using appropriate Markdown syntax for headings (#), lists (-, *), emphasis (**, *), code blocks (```), blockquotes (>), and other Markdown elements where contextually relevant. Convert any special characters used for formatting (like •, ◦, ⁃, -, *, etc.) into proper Markdown syntax. Do not modify the content or translate the text.",
    user: "Format the following text using appropriate Markdown syntax. Convert any special characters used for formatting into proper Markdown syntax. Preserve all original content and language exactly as provided, only enhance its visual structure:\n\n{text}",
  },
  html: {
    system:
      "You are a HTML formatting specialist. Your sole task is to enhance text structure using semantic HTML elements, while preserving the exact content. Apply appropriate HTML tags like <h1>-<h6>, <p>, <ul>, <ol>, <li>, <strong>, <em>, or <code>. Convert any special characters used for formatting (like •, ◦, ⁃, -, *, etc.) into proper HTML list tags. Do not add styling, scripts, meta tags, or <head> elements. Focus purely on semantic text structure.",
    user: "Format the following text using semantic HTML elements. Convert any special characters used for formatting into appropriate HTML tags. Preserve all content exactly as provided, only enhance its structure:\n\n{text}",
  },
  clean: {
    system:
      "You are a text cleanup specialist. Your sole task is to normalize and structure text by  removing unnecessary formatting artifacts, irregular spacing, inconsistent line breaks, and special characters used for formatting (like •, ◦, ⁃, -, *, etc.). Replace these with simple text structure using line breaks and proper paragraphs. Preserve all original content, meaning, and language while creating a clean, consistently formatted output. Do not modify the actual content or writing style.",
    user: "Clean and normalize the formatting of this text. Remove formatting artifacts, special characters used for formatting, fix spacing, and standardize structure while preserving all original content exactly:\n\n{text}",
  },
} as const;
