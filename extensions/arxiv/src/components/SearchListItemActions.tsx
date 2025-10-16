import { ActionPanel, Action, Icon, Clipboard, showHUD } from "@raycast/api";
import { SearchResult } from "../types";
import { formatBibTeX, getCitation, CitationStyle, CITATION_STYLES } from "../citations";

interface SearchListItemActionsProps {
  paper: SearchResult;
  citationStyle: CitationStyle;
  setCitationStyle: (style: CitationStyle) => void | Promise<void>;
}

export function SearchListItemActions({ paper, citationStyle, setCitationStyle }: SearchListItemActionsProps) {
  const handleCopyCitation = async () => {
    const citation = getCitation(paper, citationStyle);
    await Clipboard.copy(citation);
    await showHUD(`${citationStyle.toUpperCase()} citation copied`);
  };

  const handleCopyBibTeX = async () => {
    // eslint-disable-next-line @raycast/prefer-title-case
    await showHUD("BibTeX copied");
  };

  // Build array of open actions
  const openActions = [];
  if (paper.abstractUrl) {
    openActions.push(
      <Action.OpenInBrowser
        key="abstract"
        title="Open Abstract"
        url={paper.abstractUrl}
        icon={{ source: Icon.Window }}
      />
    );
  }
  if (paper.htmlUrl) {
    openActions.push(
      <Action.OpenInBrowser
        key="html"
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Open HTML (if available)"
        url={paper.htmlUrl}
        icon={{ source: Icon.Globe }}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
      />
    );
  }
  if (paper.texUrl) {
    openActions.push(
      <Action.OpenInBrowser
        key="tex"
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Download LaTeX Source"
        url={paper.texUrl}
        icon={{ source: Icon.TextDocument }}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
    );
  }
  if (paper.pdfUrl) {
    openActions.push(
      <Action.OpenInBrowser
        key="pdf"
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Open PDF"
        url={paper.pdfUrl}
        icon={{ source: Icon.Download }}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
    );
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">{openActions}</ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {[
          paper.abstractUrl && (
            <Action.CopyToClipboard
              key="copy-abstract"
              title="Copy Abstract Link"
              content={paper.abstractUrl}
              icon={{ source: Icon.Link }}
              shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
            />
          ),
          paper.pdfUrl && (
            <Action.CopyToClipboard
              key="copy-pdf"
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy PDF Link"
              content={paper.pdfUrl}
              icon={{ source: Icon.Link }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          ),
          <Action.CopyToClipboard
            key="copy-bibtex"
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Copy BibTeX"
            content={formatBibTeX(paper)}
            icon={{ source: Icon.Document }}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onCopy={handleCopyBibTeX}
          />,
          <Action
            key="copy-citation"
            title="Copy Citation"
            icon={{ source: Icon.Text }}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={handleCopyCitation}
          />,
        ].filter(Boolean)}
      </ActionPanel.Section>

      <ActionPanel.Section title="Citation Style">
        <ActionPanel.Submenu title="Select Citation Style" icon={Icon.Text} shortcut={{ modifiers: ["cmd"], key: "s" }}>
          {Object.entries(CITATION_STYLES).flatMap(([category, styles]) => [
            <Action key={category} title={category} />,
            ...styles.map((style) => (
              <Action
                key={`${category}-${style.id}`}
                // eslint-disable-next-line @raycast/prefer-title-case -- Intentional indentation for submenu items
                title={`  ${style.name}`}
                onAction={() => setCitationStyle(style.id as CitationStyle)}
                icon={citationStyle === style.id ? Icon.Check : Icon.Circle}
              />
            )),
          ])}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </ActionPanel>
  );
}
