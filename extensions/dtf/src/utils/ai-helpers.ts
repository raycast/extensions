// AI Helper utilities for DTF extension
// Functions to extract text from post blocks and generate AI prompts

import { PostBlock, PostBlockData, DisplayPost, MediaItem } from "../api/types";

/**
 * Strips HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replaceAll(/<[^>]+>/g, "").trim();
}

// Block extractors for different block types
function extractTextBlock(data: PostBlockData | undefined): string {
  return data?.text ? stripHtml(data.text) : "";
}

function extractQuoteBlock(data: PostBlockData | undefined): string {
  let quote = data?.text ? stripHtml(data.text) : "";
  if (data?.subline1 && typeof data.subline1 === "string") {
    quote += ` — ${data.subline1}`;
  }
  return quote;
}

function extractListBlock(data: PostBlockData | undefined): string {
  if (!data?.items || !Array.isArray(data.items)) return "";
  return (data.items as string[]).map((item) => `• ${stripHtml(item)}`).join("\n");
}

function extractMediaBlock(data: PostBlockData | undefined): string {
  if (!data?.items || !Array.isArray(data.items)) return "";
  const mediaItems = data.items as MediaItem[];
  return mediaItems
    .filter((item) => item.title)
    .map((item) => item.title!)
    .join("\n");
}

function extractLinkBlock(data: PostBlockData | undefined): string {
  if (!data?.link?.data) return "";
  const linkData = data.link.data;
  const parts = [linkData.title, linkData.description].filter(Boolean);
  return parts.join(" — ");
}

function extractQuizBlock(data: PostBlockData | undefined): string {
  if (!data?.title) return "";
  let quiz = `[Poll]: ${data.title}`;
  if (data.items && typeof data.items === "object" && !Array.isArray(data.items)) {
    const options = Object.values(data.items);
    quiz += "\nOptions: " + options.join(", ");
  }
  return quiz;
}

function extractPersonBlock(data: PostBlockData | undefined): string {
  const name = typeof data?.title === "string" ? data.title : "";
  if (!name) return "";
  const role = typeof data?.description === "string" ? data.description : "";
  const roleText = role ? ` — ${role}` : "";
  return `[Person]: ${name}${roleText}`;
}

const blockExtractors: Record<string, (data: PostBlockData | undefined) => string> = {
  text: extractTextBlock,
  header: extractTextBlock,
  incut: extractTextBlock,
  quote: extractQuoteBlock,
  list: extractListBlock,
  media: extractMediaBlock,
  link: extractLinkBlock,
  quiz: extractQuizBlock,
  person: extractPersonBlock,
  code: (data) => (data?.text ? `[Code block]: ${data.text.slice(0, 100)}...` : ""),
};

/**
 * Extract plain text from a single post block
 */
function extractTextFromBlock(block: PostBlock): string {
  if (block.hidden) return "";
  const extractor = blockExtractors[block.type];
  return extractor ? extractor(block.data) : "";
}

/**
 * Extract plain text content from post blocks for AI processing
 */
export function extractTextFromBlocks(blocks: PostBlock[]): string {
  if (!blocks || blocks.length === 0) return "";

  const textParts = blocks.map(extractTextFromBlock).filter((text) => text.length > 0);

  return textParts.join("\n\n");
}

/**
 * Get full post content as text for AI
 */
export function getPostTextContent(post: DisplayPost): string {
  const parts: string[] = [`Title: ${post.title}`, `Author: ${post.author.name}`];

  if (post.subsite.name) {
    parts.push(`Category: ${post.subsite.name}`);
  }

  // Content from blocks or excerpt
  if (post.blocks && post.blocks.length > 0) {
    const content = extractTextFromBlocks(post.blocks);
    if (content) {
      parts.push(`\nContent:\n${content}`);
    }
  } else if (post.excerpt) {
    parts.push(`\nExcerpt:\n${post.excerpt}`);
  }

  return parts.join("\n");
}

// ============================================================================
// AI PROMPTS
// ============================================================================

/**
 * Prompt for summarizing a post
 */
export function getSummarizePrompt(postContent: string): string {
  return `Summarize the following article in 2-3 paragraphs. Focus on the main points and key information. Keep the same language as the original article.

Article:
${postContent}

Summary:`;
}

/**
 * Prompt for translating a post to English
 */
export function getTranslatePrompt(postContent: string): string {
  return `Translate the following article to English. Preserve the structure and meaning.

Article:
${postContent}

Translation:`;
}

/**
 * Prompt for extracting key points from a post
 */
export function getKeyPointsPrompt(postContent: string): string {
  return `Extract 3-5 key points from the following article. Present them as a bullet list. Keep the same language as the original article.

Article:
${postContent}

Key points:`;
}

/**
 * Prompt for generating a quick TLDR
 */
export function getTLDRPrompt(postContent: string): string {
  return `Provide a one-sentence TLDR (summary) for this article. Be concise but informative. Keep the same language as the original article.

Article:
${postContent}

TLDR:`;
}
