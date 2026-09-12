import { List, Color } from "@raycast/api";
import { CONFERENCE_REGEX, MAX_VENUE_NAME_LENGTH, MIN_PAGE_COUNT, MAX_PAGE_COUNT } from "../constants";

interface SearchListItemAccessoriesProps {
  accessoryDisplay: "timeAgo" | "publicationInfo";
  timeAgo: string;
  journalRef?: string;
  comment?: string;
}

export function buildAccessories({
  accessoryDisplay,
  timeAgo,
  journalRef,
  comment,
}: SearchListItemAccessoriesProps): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (accessoryDisplay === "timeAgo") {
    accessories.push({ tag: timeAgo });
    return accessories;
  }

  // Publication details style
  let venue: string | null = null;

  // Check journal_ref for formal publication
  if (journalRef) {
    const publicationVenue = journalRef.split(/\s+\d{4}(?:\s|$)|\s+\d+[,:]|\s+\(/)[0]?.trim();
    if (publicationVenue && publicationVenue.length <= MAX_VENUE_NAME_LENGTH) {
      venue = publicationVenue;
    }
  }

  // Check comment for conference info
  if (!venue && comment) {
    const confMatch = comment.match(CONFERENCE_REGEX);
    if (confMatch) {
      venue = confMatch[0];
    }
  }

  // Add venue as a colored tag if found
  if (venue) {
    accessories.push({
      tag: { value: venue, color: Color.Blue },
      tooltip: journalRef || comment || undefined,
    });
  }

  // Add page count if available
  if (comment) {
    const pageMatch = comment.match(/(\d+)\s*pages?/i);
    if (pageMatch) {
      const pageCount = parseInt(pageMatch[1]);
      if (pageCount >= MIN_PAGE_COUNT && pageCount < MAX_PAGE_COUNT) {
        accessories.push({
          text: `${pageCount} pages`,
          tooltip: comment,
        });
      }
    }
  }

  return accessories;
}
