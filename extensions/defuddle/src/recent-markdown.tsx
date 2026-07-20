import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  clearHistory,
  copyMarkdown,
  formatDate,
  formatMarkdownForDetail,
  loadHistory,
  removeFromHistory,
  saveMarkdownFile,
  type HistoryItem,
} from "./lib/defuddle";

export default function RecentMarkdownCommand() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory()
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredHistory = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return history;
    }
    return history.filter((item) => `${item.title} ${item.url}`.toLowerCase().includes(query));
  }, [history, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent markdown by title or URL"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.Section title="Recent Markdown" subtitle={`${filteredHistory.length}`}>
        {filteredHistory.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Document}
            title={item.title || item.url}
            subtitle={item.url}
            accessories={[{ text: formatDate(item.createdAt) }]}
            actions={<RecentMarkdownActions item={item} onHistoryChange={setHistory} />}
          />
        ))}
      </List.Section>

      {!isLoading && filteredHistory.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Recent Markdown"
          description="Run Get Markdown first to create and save extracted results."
        />
      ) : null}
    </List>
  );
}

function RecentMarkdownActions(props: { item: HistoryItem; onHistoryChange: (history: HistoryItem[]) => void }) {
  return (
    <ActionPanel>
      <Action.Push
        title="View Markdown"
        icon={Icon.Sidebar}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "e" },
          Windows: { modifiers: ["ctrl"], key: "e" },
        }}
        target={<HistoryDetail item={props.item} onHistoryChange={props.onHistoryChange} />}
      />
      <Action
        title="Copy Markdown"
        icon={Icon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => copyMarkdown(props.item.markdown)}
      />
      <Action
        title="Save Markdown to Downloads"
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={() => saveMarkdownFile(props.item)}
      />
      <Action.OpenInBrowser url={props.item.url} shortcut={Keyboard.Shortcut.Common.Open} />
      <ActionPanel.Section title="History">
        <Action
          title="Remove from History"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => props.onHistoryChange(await removeFromHistory(props.item.id))}
        />
        <Action
          title="Clear History"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={async () => props.onHistoryChange(await clearHistory())}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function HistoryDetail(props: { item: HistoryItem; onHistoryChange: (history: HistoryItem[]) => void }) {
  const [isShowingMetadata, setIsShowingMetadata] = useState(false);

  return (
    <Detail
      markdown={formatMarkdownForDetail(props.item)}
      metadata={isShowingMetadata ? <HistoryMetadata item={props.item} /> : undefined}
      actions={
        <ActionPanel>
          <Action
            title="Copy Markdown"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => copyMarkdown(props.item.markdown)}
          />
          <Action
            title="Save Markdown to Downloads"
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => saveMarkdownFile(props.item)}
          />
          <Action.OpenInBrowser url={props.item.url} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action
            title={isShowingMetadata ? "Hide Details Sidebar" : "Show Details Sidebar"}
            icon={isShowingMetadata ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
            onAction={() => setIsShowingMetadata((value) => !value)}
          />
          <ActionPanel.Section title="History">
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => props.onHistoryChange(await removeFromHistory(props.item.id))}
            />
            <Action
              title="Clear History"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={async () => props.onHistoryChange(await clearHistory())}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HistoryMetadata(props: { item: HistoryItem }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Title" text={props.item.title} />
      <Detail.Metadata.Link title="URL" text={props.item.url} target={props.item.url} />
      {props.item.author ? <Detail.Metadata.Label title="Author" text={props.item.author} /> : null}
      {props.item.domain ? <Detail.Metadata.Label title="Domain" text={props.item.domain} /> : null}
      {props.item.wordCount ? <Detail.Metadata.Label title="Words" text={String(props.item.wordCount)} /> : null}
      <Detail.Metadata.Label title="Extracted" text={formatDate(props.item.createdAt)} />
    </Detail.Metadata>
  );
}
