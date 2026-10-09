import { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Clipboard,
  open,
} from "@raycast/api";
import {
  getBadgeMarkdown,
  getBadgeUrl,
  getBadgeHtml,
  LINTEN_CLOUD_BASE,
  isValidUrlInput,
} from "./api";

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
}

function buildBadgeDetail(domain: string): string {
  const badgeUrl = getBadgeUrl(domain);
  const markdownSnippet = getBadgeMarkdown(domain);
  const htmlSnippet = getBadgeHtml(domain);

  return [
    `# Spec v2 README Badge for \`${domain}\``,
    "",
    "Display real-time compliance score and discovery readiness on your repository README or developer documentation.",
    "",
    `![Spec v2 Badge](${badgeUrl})`,
    "",
    "### Markdown Snippet",
    "```markdown",
    markdownSnippet,
    "```",
    "",
    "### HTML Snippet",
    "```html",
    htmlSnippet,
    "```",
    "",
    "### Direct Image URL",
    `\`${badgeUrl}\``,
  ].join("\n");
}

export default function BadgeCommand() {
  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef<string>("");
  searchTextRef.current = searchText;
  const [clipboardDomain, setClipboardDomain] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    async function checkClipboard() {
      try {
        const clip = await Clipboard.readText();
        if (clip && clip.trim().length > 0) {
          const trimmed = clip.trim();
          if (isValidUrlInput(trimmed)) {
            const cleaned = cleanDomain(trimmed);
            setClipboardDomain(cleaned);
            if (!searchTextRef.current.trim()) {
              setSelectedItemId("clip-badge");
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }
    checkClipboard();
  }, []);

  function handleSearchTextChange(text: string) {
    setSearchText(text);
    if (text.trim().length > 0) {
      setSelectedItemId("typed-badge");
    } else if (clipboardDomain) {
      setSelectedItemId("clip-badge");
    }
  }

  const isTyping = searchText.trim().length > 0;
  const typedDomain = isTyping ? cleanDomain(searchText) : "";
  const isValidTyped =
    isTyping &&
    typedDomain.length > 0 &&
    (isValidUrlInput(searchText.trim()) || isValidUrlInput(typedDomain));

  function getActionsForDomain(domain: string) {
    const md = getBadgeMarkdown(domain);
    const html = getBadgeHtml(domain);
    const url = getBadgeUrl(domain);

    return (
      <ActionPanel>
        <Action.CopyToClipboard
          title="Copy Markdown Badge"
          icon={Icon.Tag}
          content={md}
        />
        <Action.CopyToClipboard
          title="Copy HTML Badge"
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          content={html}
        />
        <Action.CopyToClipboard
          title="Copy Direct Image URL"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          content={url}
        />
        <Action
          title="Open Badge in Browser"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={() => open(url)}
        />
        <Action
          title="Open in Linten Web Inspector"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            open(`${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(domain)}`)
          }
        />
      </ActionPanel>
    );
  }

  return (
    <List
      isShowingDetail={true}
      filtering={false}
      searchBarPlaceholder="Enter domain (e.g. example.com) or paste URL..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
    >
      {isTyping && (
        <List.Section title="Typed Target">
          {isValidTyped ? (
            <List.Item
              id="typed-badge"
              icon={{ source: Icon.Tag, tintColor: Color.Blue }}
              title={typedDomain}
              subtitle="Press Enter to copy Markdown badge"
              accessories={[{ tag: { value: "Typed", color: Color.Blue } }]}
              actions={getActionsForDomain(typedDomain)}
              detail={
                <List.Item.Detail markdown={buildBadgeDetail(typedDomain)} />
              }
            />
          ) : (
            <List.Item
              id="typed-badge"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={searchText.trim()}
              subtitle="Invalid domain format (e.g. company.com)"
              accessories={[{ tag: { value: "Invalid", color: Color.Red } }]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# Invalid Domain Format`,
                    "",
                    `\`${searchText.trim()}\` is not recognized as a valid domain or URL.`,
                    "",
                    "### Expected Format",
                    "- Standard domain: `example.com`",
                    "- Subdomain: `docs.example.com`",
                    "- Full URL: `https://example.com`",
                  ].join("\n")}
                />
              }
            />
          )}
        </List.Section>
      )}
      {clipboardDomain ? (
        <List.Section title="Clipboard">
          <List.Item
            id="clip-badge"
            icon={{ source: Icon.Clipboard, tintColor: Color.Green }}
            title={clipboardDomain}
            subtitle="From clipboard"
            accessories={[{ tag: { value: "Clipboard", color: Color.Green } }]}
            actions={getActionsForDomain(clipboardDomain)}
            detail={
              <List.Item.Detail markdown={buildBadgeDetail(clipboardDomain)} />
            }
          />
        </List.Section>
      ) : null}
      {!isTyping && !clipboardDomain && (
        <List.Section title="Example">
          <List.Item
            id="example-badge"
            icon={{ source: Icon.Tag, tintColor: Color.SecondaryText }}
            title="acme.com"
            subtitle="Demo preview"
            accessories={[
              { tag: { value: "Example", color: Color.SecondaryText } },
            ]}
            actions={getActionsForDomain("acme.com")}
            detail={
              <List.Item.Detail markdown={buildBadgeDetail("acme.com")} />
            }
          />
        </List.Section>
      )}
    </List>
  );
}
