import { ActionPanel, Action, Icon, Toast, showToast, Clipboard } from "@raycast/api";
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
    showToast({ style: Toast.Style.Success, title: `${citationStyle.toUpperCase()} citation copied` });
  };

  const handleCopyBibTeX = () => {
    showToast({ style: Toast.Style.Success, title: "BibTeX copied" });
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        {paper.abstractUrl && (
          <Action.OpenInBrowser title="Open Abstract" url={paper.abstractUrl} icon={{ source: Icon.Window }} />
        )}
        {paper.htmlUrl && (
          <Action.OpenInBrowser
            title="Open HTML (if Available)"
            url={paper.htmlUrl}
            icon={{ source: Icon.Globe }}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
        )}
        {paper.texUrl && (
          <Action.OpenInBrowser
            title="Download LaTeX Source"
            url={paper.texUrl}
            icon={{ source: Icon.TextDocument }}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        )}
        {paper.pdfUrl && (
          <Action.OpenInBrowser
            title="Open PDF"
            url={paper.pdfUrl}
            icon={{ source: Icon.Download }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {paper.abstractUrl && (
          <Action.CopyToClipboard
            title="Copy Abstract Link"
            content={paper.abstractUrl}
            icon={{ source: Icon.Link }}
            shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
          />
        )}
        {paper.pdfUrl && (
          <Action.CopyToClipboard
            title="Copy PDF Link"
            content={paper.pdfUrl}
            icon={{ source: Icon.Link }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        )}
        <Action.CopyToClipboard
          title="Copy BibTeX"
          content={formatBibTeX(paper)}
          icon={{ source: Icon.Document }}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onCopy={handleCopyBibTeX}
        />
        <Action
          title="Copy Citation"
          icon={{ source: Icon.Text }}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={handleCopyCitation}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Citation Style">
        <ActionPanel.Submenu title="Select Citation Style" icon={Icon.Text} shortcut={{ modifiers: ["cmd"], key: "s" }}>
          {Object.entries(CITATION_STYLES).map(([category, styles]) => [
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
