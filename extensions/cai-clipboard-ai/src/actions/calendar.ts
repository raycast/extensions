import { open, showToast, Toast } from "@raycast/api";
import { ContentResult } from "../detection/types";

/**
 * Create a calendar event
 */
export async function createCalendarEvent(text: string, detection: ContentResult): Promise<void> {
  const { date, location } = detection.entities;

  if (!date) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No date detected",
    });
    return;
  }

  // Extract a title from the text
  const title = extractEventTitle(text) || "Event";

  // Use Google Calendar for better pre-filling support
  const gcalUrl = buildGoogleCalendarUrl(title, date, location, text);
  await open(gcalUrl);

  await showToast({
    style: Toast.Style.Success,
    title: "Opening Calendar",
    message: title,
  });
}

function extractEventTitle(text: string): string {
  // Remove common time and location indicators to clean up the title
  const cleaned = text
    // Remove date/time patterns
    .replace(
      /\b(?:on|at)?\s*(?:tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      "",
    )
    .replace(/\b(?:next|this)\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|h)?\b/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|h)\b/gi, "")
    .replace(/\bfrom\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|h)?\s+onwards?\b/gi, "")
    // Remove location patterns
    .replace(/\bat\s+(?:the\s+)?[A-Z][^.!?]*$/i, "")
    .replace(/\bin\s+(?:the\s+)?[A-Z][^.!?]*$/i, "")
    .trim();

  // Try to extract meaningful subjects from common meeting patterns
  const patterns = [
    /(?:meeting|call|sync|chat)\s+(?:about|re:?|for|on)\s+(.+)/i,
    /(?:discuss|talk about|review)\s+(?:the\s+)?(.+)/i,
    /(?:let's|lets)\s+(?:sync|meet|chat|discuss)\s+(?:about|on|re:?)?\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1].trim()) {
      let title = match[1].trim();
      // Capitalize first letter and remove leading "the"
      title = title.replace(/^the\s+/i, "");
      title = title.charAt(0).toUpperCase() + title.slice(1);
      return title.length > 50 ? title.slice(0, 47) + "..." : title;
    }
  }

  // Check for generic/vague phrases that should just be "Meeting"
  const genericPatterns = [
    /^(let'?s?\s*)?(meet|sync|call|chat)$/i,
    /^(i'?m?\s*)?(gonna be|will be|going to be)\s+(working|there|around)$/i,
    /^shall we (meet|have)/i,
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(cleaned)) {
      return "Meeting";
    }
  }

  // If cleaned text is too short or empty, use "Meeting"
  if (cleaned.length < 3) {
    return "Meeting";
  }

  // Fallback: use cleaned text, limit to reasonable length
  return cleaned.length > 50 ? cleaned.slice(0, 47) + "..." : cleaned || "Meeting";
}

function buildGoogleCalendarUrl(title: string, date: Date, location?: string, originalText?: string): string {
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const endDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 hour

  // Build description with original text
  let description = "";
  if (originalText) {
    description = `"${originalText}"\n\n`;
  }
  description += "Created with Cai, a Raycast extension.";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDate(date)}/${formatDate(endDate)}`,
    details: description,
  });

  if (location) params.set("location", location);

  return `https://calendar.google.com/calendar/render?${params}`;
}
