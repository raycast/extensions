import { Icon } from "@raycast/api";

/**
 * Build a Heptabase URL for an object
 * @param spaceId - The Heptabase space ID from preferences
 * @param type - The object type (card, journal, whiteboard, etc.)
 * @param id - The object ID
 * @returns The full Heptabase URL, or null if spaceId is missing
 */
export function buildHeptabaseUrl(spaceId: string | undefined, type: string, id: string): string | null {
  if (!spaceId || !id || id === "__raw__") {
    return null;
  }

  // URL patterns differ by object type
  const pathSegment = type === "whiteboard" ? "whiteboard" : "card";
  return `https://app.heptabase.com/${spaceId}/${pathSegment}/${id}`;
}

/**
 * Get icon for object type
 */
export function getObjectIcon(type: string): Icon {
  switch (type) {
    case "card":
      return Icon.Document;
    case "pdfCard":
      return Icon.Book;
    case "mediaCard":
    case "videoCard":
    case "audioCard":
      return Icon.Video;
    case "imageCard":
      return Icon.Image;
    case "journal":
      return Icon.Calendar;
    case "highlightElement":
      return Icon.Highlight;
    case "whiteboard":
      return Icon.AppWindowGrid2x2;
    case "section":
      return Icon.Folder;
    case "textElement":
      return Icon.Text;
    case "mindmap":
      return Icon.List;
    default:
      return Icon.Circle;
  }
}
