import { ActionPanel, Action, showToast, Toast } from "@raycast/api";
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
        title={`Copy Title: ${title.length > APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH ? `${title.substring(0, APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH)}...` : title}`}
        content={title}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Title" })}
      />
      <Action.CopyToClipboard
        title={`Copy Reference: ${reference}`}
        content={reference}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Reference" })}
      />
      <Action.CopyToClipboard
        title={`Copy Highlighted: ${highlightedText.length > APP_CONSTANTS.SEARCH.HIGHLIGHTED_TEXT_PREVIEW_LENGTH ? `${highlightedText.substring(0, APP_CONSTANTS.SEARCH.HIGHLIGHTED_TEXT_PREVIEW_LENGTH)}...` : highlightedText}`}
        content={highlightedText}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Highlighted Text" })}
      />
      <Action.CopyToClipboard
        title={`Copy First Match: ${firstMatch.length > APP_CONSTANTS.SEARCH.HIGHLIGHTED_TEXT_PREVIEW_LENGTH ? `${firstMatch.substring(0, APP_CONSTANTS.SEARCH.HIGHLIGHTED_TEXT_PREVIEW_LENGTH)}...` : firstMatch}`}
        content={firstMatch}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied First Match" })}
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
}

/**
 * Action panel for source detail view
 */
export function SourceDetailActionPanel({
  reference,
  hebrewText,
  englishText,
  footnotes,
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
      <Action.CopyToClipboard
        title={`Copy Hebrew: ${hebrewText.length > APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH ? `${hebrewText.substring(0, APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH)}...` : hebrewText}`}
        content={hebrewText}
        shortcut={APP_CONSTANTS.SHORTCUTS.COPY_HEBREW}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Hebrew Text" })}
      />
      <Action.CopyToClipboard
        title={`Copy English: ${englishText.length > APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH ? `${englishText.substring(0, APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH)}...` : englishText}`}
        content={englishText}
        shortcut={APP_CONSTANTS.SHORTCUTS.COPY_ENGLISH}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied English Text" })}
      />
      <Action.CopyToClipboard
        title={`Copy Both: ${bothTexts.length > APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH ? `${bothTexts.substring(0, APP_CONSTANTS.SEARCH.COPY_ACTION_PREVIEW_LENGTH)}...` : bothTexts}`}
        content={bothTexts}
        shortcut={APP_CONSTANTS.SHORTCUTS.COPY_ALL}
        onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Both Texts" })}
      />
      {footnotes.length > 0 && (
        <Action.CopyToClipboard
          title={`Copy Footnotes (${footnotes.length})`}
          content={footnotes.map((note, i) => `${i + 1}. ${note}`).join("\n")}
          shortcut={APP_CONSTANTS.SHORTCUTS.COPY_FOOTNOTES}
          onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied Footnotes" })}
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
