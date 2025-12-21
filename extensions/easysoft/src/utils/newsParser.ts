import { NewsItem, NewsAttachment, NewsMetadata } from "../types";

/**
 * Parses HTML news page from SchoolSoft into structured news items
 * Adapted from news-backend.md documentation for Node.js/Raycast environment
 * Uses regex and string manipulation since DOMParser isn't available
 */
export function parseNewsHtml(html: string): NewsItem[] {
  if (!html || typeof html !== "string") {
    console.log("[NEWS_PARSER] No HTML provided or invalid type");
    return [];
  }

  console.log("[NEWS_PARSER] Parsing HTML, length:", html.length);

  const newsItems: NewsItem[] = [];

  // First, find all accordion-group IDs by looking for the id attribute pattern
  // Pattern: id="accordion-group{number}" or id='accordion-group{number}'
  const idPattern = /id=["']accordion-group(\d+)["']/g;
  const groupIds: string[] = [];
  let idMatch;

  while ((idMatch = idPattern.exec(html)) !== null) {
    const groupId = idMatch[1];
    if (groupId && !groupIds.includes(groupId)) {
      groupIds.push(groupId);
    }
  }

  console.log("[NEWS_PARSER] Found", groupIds.length, "accordion group IDs:", groupIds);

  // For each group ID, extract the news item data
  for (const groupId of groupIds) {
    try {
      // Extract title from <span id='name{id}'> or <span id="name{id}">
      const titlePattern = new RegExp(`<span[^>]*id=["']name${groupId}["'][^>]*>([\\s\\S]*?)<\\/span>`, "i");
      const titleMatch = html.match(titlePattern);
      const title = titleMatch ? cleanHtmlText(titleMatch[1]) : "";

      if (!title) {
        console.log(`[NEWS_PARSER] Skipping group ${groupId} - no title found`);
        continue; // Skip items without titles
      }

      console.log(`[NEWS_PARSER] Processing group ${groupId}: "${title.substring(0, 50)}..."`);

      // Extract preview from .preview-block (search within reasonable distance of the group)
      const previewPattern = new RegExp(`<div[^>]*class=["']preview-block["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const previewMatch = html.match(previewPattern);
      const preview = previewMatch ? cleanHtmlText(previewMatch[1]) : "";

      // Extract date from .accordion-heading-date-wide
      const datePattern = new RegExp(
        `<div[^>]*class=["']accordion-heading-date-wide["'][^>]*>([\\s\\S]*?)<\\/div>`,
        "i",
      );
      const dateMatch = html.match(datePattern);
      const date = dateMatch ? cleanHtmlText(dateMatch[1]) : "";

      // Extract content from <span id='description{id}'>
      let content = "";
      const contentPattern = new RegExp(`<span[^>]*id=["']description${groupId}["'][^>]*>([\\s\\S]*?)<\\/span>`, "i");
      const contentMatch = html.match(contentPattern);

      if (contentMatch) {
        content = contentMatch[1];
      } else {
        // Handle malformed HTML - look for content after acc-item-main with this ID
        const accItemMainPattern = new RegExp(
          `<p[^>]*class=["']acc-item-main["'][^>]*>[\\s\\S]*?<span[^>]*id=["']description${groupId}["'][^>]*>[\\s\\S]*?<\\/span>[\\s\\S]*?<\\/p>`,
          "i",
        );
        const accItemMatch = html.match(accItemMainPattern);

        if (accItemMatch) {
          // Find the position after this p tag and collect following siblings
          const accItemIndex = html.indexOf(accItemMatch[0]);
          const afterAccItem = html.substring(accItemIndex + accItemMatch[0].length);

          // Stop at form or accordion_inner_right
          const formIndex = afterAccItem.indexOf("<form");
          const accordionInnerRightIndex = afterAccItem.indexOf('<div class="accordion_inner_right"');

          const stopIndex =
            formIndex !== -1 && formIndex < accordionInnerRightIndex
              ? formIndex
              : accordionInnerRightIndex !== -1
                ? accordionInnerRightIndex
                : Math.min(2000, afterAccItem.length); // Limit to prevent huge content

          content = afterAccItem.substring(0, stopIndex).trim();
        }
      }

      // Extract metadata from .accordion_inner_right
      const metadata: NewsMetadata = {};

      // Find the accordion_inner_right div and extract metadata from it
      const metadataPattern = new RegExp(`<div[^>]*class=["']accordion_inner_right["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const metadataMatch = html.match(metadataPattern);

      if (metadataMatch) {
        const metadataHtml = metadataMatch[1];

        // Extract "From" - look for label followed by div
        const fromPattern = /<label[^>]*>From<\/label>\s*<div[^>]*>([\s\S]*?)<\/div>/i;
        const fromMatch = metadataHtml.match(fromPattern);
        if (fromMatch) {
          metadata.from = cleanHtmlText(fromMatch[1]);
        }

        // Extract "To"
        const toPattern = /<label[^>]*>To<\/label>\s*<div[^>]*>([\s\S]*?)<\/div>/i;
        const toMatch = metadataHtml.match(toPattern);
        if (toMatch) {
          metadata.to = cleanHtmlText(toMatch[1]);
        }

        // Extract "Published"
        const publishedPattern = /<label[^>]*>Published<\/label>\s*<div[^>]*>([\s\S]*?)<\/div>/i;
        const publishedMatch = metadataHtml.match(publishedPattern);
        if (publishedMatch) {
          metadata.published = cleanHtmlText(publishedMatch[1]);
        }

        // Extract "Show to"
        const showToPattern = /<label[^>]*>Show to<\/label>\s*<div[^>]*>([\s\S]*?)<\/div>/i;
        const showToMatch = metadataHtml.match(showToPattern);
        if (showToMatch) {
          metadata.showTo = cleanHtmlText(showToMatch[1]);
        }
      }

      // Extract audience flags from hidden divs (search in full HTML)
      const toTeacherPattern = new RegExp(`<div[^>]*id=["']toTeacher${groupId}["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const toTeacherMatch = html.match(toTeacherPattern);
      metadata.toTeacher = toTeacherMatch ? cleanHtmlText(toTeacherMatch[1]) === "1" : false;

      const toStudentPattern = new RegExp(`<div[^>]*id=["']toStudent${groupId}["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const toStudentMatch = html.match(toStudentPattern);
      metadata.toStudent = toStudentMatch ? cleanHtmlText(toStudentMatch[1]) === "1" : false;

      const toParentPattern = new RegExp(`<div[^>]*id=["']toParent${groupId}["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const toParentMatch = html.match(toParentPattern);
      metadata.toParent = toParentMatch ? cleanHtmlText(toParentMatch[1]) === "1" : false;

      // Extract attachments from #fileAttach{id}
      const attachments: NewsAttachment[] = [];
      const fileAttachPattern = new RegExp(`<div[^>]*id=["']fileAttach${groupId}["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
      const fileAttachMatch = html.match(fileAttachPattern);

      if (fileAttachMatch) {
        const fileAttachHtml = fileAttachMatch[1];
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;

        while ((linkMatch = linkRegex.exec(fileAttachHtml)) !== null) {
          const url = linkMatch[1];
          const linkText = cleanHtmlText(linkMatch[2]);

          // Try to extract size from text (e.g., "document.pdf (92 KB)")
          const sizeMatch = linkText.match(/\(([^)]+)\)/);
          const size = sizeMatch ? sizeMatch[1] : undefined;
          const name = linkText.replace(/\([^)]+\)/, "").trim();

          if (url && name) {
            attachments.push({ name, url, size });
          }
        }
      }

      newsItems.push({
        id: groupId,
        title,
        preview,
        date,
        content,
        metadata,
        attachments,
      });

      console.log(`[NEWS_PARSER] Successfully parsed item ${groupId}: "${title}"`);
    } catch (error) {
      console.error(`[NEWS_PARSER] Error parsing group ${groupId}:`, error);
    }
  }

  console.log(`[NEWS_PARSER] Parsed ${newsItems.length} news items`);
  return newsItems;
}

/**
 * Cleans HTML text by removing tags and decoding entities
 */
function cleanHtmlText(html: string): string {
  if (!html) {
    return "";
  }

  // Remove HTML tags
  let text = html.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
