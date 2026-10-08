import { Action, ActionPanel, Color, Detail, Icon, List, open, showHUD, Keyboard } from "@raycast/api";
import { hubImportDeepLink, hubWebURL, trackHubImport } from "../lib/hub-api";
import { toDetailMarkdown, toMarkdownBlock } from "../lib/language";
import { getPrefs } from "../lib/preferences";
import type { HubSnippet } from "../lib/types";

async function addToSnipperApp(snippet: HubSnippet) {
  await open(hubImportDeepLink(snippet.id));
  if (getPrefs().trackHubAnalytics) void trackHubImport(snippet.id);
  await showHUD("Opening SnipperApp to import…");
}

function HubSnippetActions({ snippet, inDetail }: { snippet: HubSnippet; inDetail?: boolean }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Add to SnipperApp" icon={Icon.Plus} onAction={() => addToSnipperApp(snippet)} />
        <Action.CopyToClipboard title="Copy Code" content={snippet.code} />
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={toMarkdownBlock(snippet.code, snippet.language)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {!inDetail && (
          <Action.Push title="Show Details" icon={Icon.Eye} target={<HubSnippetDetail snippet={snippet} />} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open on Hub"
          url={hubWebURL(snippet.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function HubSnippetDetail({ snippet }: { snippet: HubSnippet }) {
  const author = snippet.author_display_name || snippet.author_username || "Unknown";
  return (
    <Detail
      navigationTitle={snippet.title}
      markdown={toDetailMarkdown(snippet.title, snippet.code, snippet.language)}
      metadata={
        <Detail.Metadata>
          {snippet.description ? <Detail.Metadata.Label title="Description" text={snippet.description} /> : null}
          <Detail.Metadata.Label title="Language" text={snippet.language} />
          <Detail.Metadata.Label title="Author" text={author} icon={Icon.Person} />
          <Detail.Metadata.Label title="Views" text={String(snippet.view_count ?? 0)} icon={Icon.Eye} />
          <Detail.Metadata.Label title="Imports" text={String(snippet.import_count ?? 0)} icon={Icon.Download} />
          {snippet.tags?.length ? (
            <Detail.Metadata.TagList title="Tags">
              {snippet.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={<HubSnippetActions snippet={snippet} inDetail />}
    />
  );
}

export function HubListItem({ snippet }: { snippet: HubSnippet }) {
  const author = snippet.author_display_name || snippet.author_username;
  const accessories: List.Item.Accessory[] = [{ tag: { value: snippet.language, color: Color.SecondaryText } }];
  if (typeof snippet.view_count === "number") accessories.push({ icon: Icon.Eye, text: String(snippet.view_count) });
  if (author) accessories.push({ icon: Icon.Person, tooltip: author });

  return (
    <List.Item
      icon={Icon.Globe}
      title={snippet.title}
      subtitle={snippet.description ?? undefined}
      accessories={accessories}
      actions={<HubSnippetActions snippet={snippet} />}
    />
  );
}
