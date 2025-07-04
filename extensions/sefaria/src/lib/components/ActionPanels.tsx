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
      <Action title="View Full Source" onAction={onViewFullSource} icon={APP_CONSTANTS.ICONS.VIEW_SOURCE} />
      <Action.OpenInBrowser url={sefariaUrl} title="Open on Sefaria" shortcut={APP_CONSTANTS.SHORTCUTS.OPEN_BROWSER} />
      <Action.CopyToClipboard title="Copy Title" content={title} />
      <Action.CopyToClipboard title="Copy Reference" content={reference} />
      <Action.CopyToClipboard title="Copy Highlighted Text" content={highlightedText} />
      <Action.CopyToClipboard title="Copy First Match" content={firstMatch} />
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
  const bothTexts = `Hebrew:\n${hebrewText}\n\nEnglish:\n${englishText}${
    footnotes.length > 0 ? "\n\nFootnotes:\n" + footnotes.map((note, i) => `${i + 1}. ${note}`).join("\n") : ""
  }`;

  return (
    <ActionPanel>
      <Action title="Back to Search" onAction={onBack} shortcut={APP_CONSTANTS.SHORTCUTS.BACK} />
      <Action.OpenInBrowser url={sefariaUrl} title="View on Sefaria" shortcut={APP_CONSTANTS.SHORTCUTS.OPEN_BROWSER} />
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
