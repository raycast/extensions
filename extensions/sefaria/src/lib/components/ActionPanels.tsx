import { ActionPanel, Action } from "@raycast/api";
import { APP_CONSTANTS } from "../constants/app";

/**
 * Props for SearchResultActionPanel
 */
interface SearchResultActionPanelProps {
  reference: string;
  title: string;
  highlightedText: string;
  firstMatch: string;
  onViewFullSource: () => void;
}

/**
 * Action panel for search results
 */
export function SearchResultActionPanel({
  reference,
  title,
  highlightedText,
  firstMatch,
  onViewFullSource,
}: SearchResultActionPanelProps) {
  const sefariaUrl = `${APP_CONSTANTS.URLS.SEFARIA_BASE}/${encodeURIComponent(reference)}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={sefariaUrl} title="Open on Sefaria" shortcut={APP_CONSTANTS.SHORTCUTS.OPEN_BROWSER} />
      <Action title="View Full Source" onAction={onViewFullSource} icon={APP_CONSTANTS.ICONS.VIEW_SOURCE} />
      <Action.CopyToClipboard
        title={`Copy Title: ${title.length > 25 ? `${title.substring(0, 25)}...` : title}`}
        content={title}
      />
      <Action.CopyToClipboard title={`Copy Reference: ${reference}`} content={reference} />
      <Action.CopyToClipboard
        title={`Copy Highlighted: ${highlightedText.length > 20 ? `${highlightedText.substring(0, 20)}...` : highlightedText}`}
        content={highlightedText}
      />
      <Action.CopyToClipboard
        title={`Copy First Match: ${firstMatch.length > 20 ? `${firstMatch.substring(0, 20)}...` : firstMatch}`}
        content={firstMatch}
      />
    </ActionPanel>
  );
}

/**
 * Props for SourceDetailActionPanel
 */
interface SourceDetailActionPanelProps {
  reference: string;
  hebrewText: string;
  englishText: string;
  footnotes: string[];
  onBack: () => void;
}

/**
 * Action panel for source detail view
 */
export function SourceDetailActionPanel({
  reference,
  hebrewText,
  englishText,
  footnotes,
  onBack,
}: SourceDetailActionPanelProps) {
  const sefariaUrl = `${APP_CONSTANTS.URLS.SEFARIA_BASE}/${encodeURIComponent(reference)}`;
  const bothTexts = [
    hebrewText && `Hebrew:\n${hebrewText}`,
    englishText && `English:\n${englishText}`,
    footnotes.length > 0 && `Footnotes:\n${footnotes.map((note, i) => `${i + 1}. ${note}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={sefariaUrl} title="View on Sefaria" shortcut={APP_CONSTANTS.SHORTCUTS.OPEN_BROWSER} />
      <Action title="Back to Search" onAction={onBack} shortcut={APP_CONSTANTS.SHORTCUTS.BACK} />
      <Action.CopyToClipboard
        title="Copy Hebrew Text"
        content={hebrewText}
        shortcut={APP_CONSTANTS.SHORTCUTS.COPY_HEBREW}
      />
      <Action.CopyToClipboard
        title="Copy English Text"
        content={englishText}
        shortcut={APP_CONSTANTS.SHORTCUTS.COPY_ENGLISH}
      />
      <Action.CopyToClipboard title="Copy Both Texts" content={bothTexts} shortcut={APP_CONSTANTS.SHORTCUTS.COPY_ALL} />
      {footnotes.length > 0 && (
        <Action.CopyToClipboard
          title="Copy Footnotes"
          content={footnotes.map((note, i) => `${i + 1}. ${note}`).join("\n")}
          shortcut={APP_CONSTANTS.SHORTCUTS.COPY_FOOTNOTES}
        />
      )}
    </ActionPanel>
  );
}

/**
 * Error action panel for when something goes wrong
 */
export function ErrorActionPanel() {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={APP_CONSTANTS.URLS.SEFARIA_BASE} title="Browse Sefaria" />
    </ActionPanel>
  );
}

/**
 * No results action panel
 */
export function NoResultsActionPanel({ query }: { query: string }) {
  const searchUrl = `${APP_CONSTANTS.URLS.SEFARIA_SEARCH}?q=${encodeURIComponent(query)}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={searchUrl} title="Search on Sefaria" />
    </ActionPanel>
  );
}
