import { PostHightlightsI } from "./utils/types";

export function getFilePathForNewPost(basePath: string, timestamp: Date = new Date()) {
  const date = new Date();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear().toString();
  const fileName = getFormattedTimestamp();
  return `${basePath}/${year}/${month}/${fileName}`;
}

export function getFormattedTimestamp(date: Date = new Date()) {
  const currentDate = date;

  const year = String(currentDate.getFullYear()).slice(-2);
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const hours = String(currentDate.getHours()).padStart(2, "0");
  const minutes = String(currentDate.getMinutes()).padStart(2, "0");
  const seconds = String(currentDate.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}.md`;
}

export function getRelativeFilePath() {
  const date = new Date();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear().toString();
  const fileName = getFormattedTimestamp();
  return `${year}/${month}/${fileName}`;
}

// Pile does not currently set the highlight color in the post data, so we need to
// calculate it based on the highlight type.
export function renderHighlightColor(highlight: string) {
  switch (highlight) {
    case PostHightlightsI.DoLater:
      return "#4de64d";
    case PostHightlightsI.Highlight:
      return "#FF703A";
    case PostHightlightsI.NewIdea:
      return "#017AFF";
    case PostHightlightsI.None:
      return "white";
    default:
      return "white";
  }
}
