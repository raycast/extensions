import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getSelectedText,
  Icon,
  Keyboard,
  List,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  clearHistory,
  copyMarkdown,
  extractMarkdown,
  formatErrorMarkdown,
  formatDate,
  formatLoadingMarkdown,
  formatMarkdownForDetail,
  normalizeUrl,
  removeFromHistory,
  saveMarkdownFile,
  saveToHistory,
  type HistoryItem,
} from "./lib/defuddle";

type SuggestedInput = {
  source: "Argument" | "Selected Text" | "Clipboard";
  url: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments.GetMarkdown }>) {
  const argumentUrl = normalizeUrl(props.arguments.url ?? "");
  const [searchText, setSearchText] = useState(argumentUrl ?? "");
  const [suggestedInputs, setSuggestedInputs] = useState<SuggestedInput[]>([]);
  const normalizedUrl = normalizeUrl(searchText);

  useEffect(() => {
    async function loadSuggestedInputs() {
      const inputs: SuggestedInput[] = [];

      if (argumentUrl) {
        inputs.push({ source: "Argument", url: argumentUrl });
      }

      const selectedUrl = normalizeUrl(await getSelectedText().catch(() => ""));
      if (selectedUrl && !inputs.some((input) => input.url === selectedUrl)) {
        inputs.push({ source: "Selected Text", url: selectedUrl });
      }

      const clipboardUrl = normalizeUrl((await Clipboard.readText().catch(() => "")) ?? "");
      if (clipboardUrl && !selectedUrl && !inputs.some((input) => input.url === clipboardUrl)) {
        inputs.push({ source: "Clipboard", url: clipboardUrl });
      }

      setSuggestedInputs(inputs);
    }

    loadSuggestedInputs();
  }, [argumentUrl]);

  return (
    <List searchBarPlaceholder="Paste a URL or use suggested inputs" onSearchTextChange={setSearchText} throttle>
      {normalizedUrl ? <ExtractUrlItem title="Extract Markdown" subtitle={normalizedUrl} url={normalizedUrl} /> : null}

      {suggestedInputs.length > 0 ? (
        <List.Section title="Suggested Inputs">
          {suggestedInputs.map((input) => (
            <ExtractUrlItem
              key={`${input.source}-${input.url}`}
              title={`Extract from ${input.source}`}
              subtitle={input.url}
              url={input.url}
            />
          ))}
        </List.Section>
      ) : null}

      {!normalizedUrl && suggestedInputs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Ready to Extract"
          description="Paste a URL above, or select/copy one before opening this command."
        />
      ) : null}
    </List>
  );
}

function ExtractUrlItem(props: { title: string; subtitle: string; url: string }) {
  return (
    <List.Item
      icon={Icon.Download}
      title={props.title}
      subtitle={props.subtitle}
      actions={
        <ActionPanel>
          <Action.Push
            title="Extract and View Markdown"
            icon={Icon.Document}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "e" },
              Windows: { modifiers: ["ctrl"], key: "e" },
            }}
            target={<MarkdownDetail url={props.url} />}
          />
        </ActionPanel>
      }
    />
  );
}

function MarkdownDetail(props: { url: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<HistoryItem>();
  const [error, setError] = useState<string>();
  const [isShowingMetadata, setIsShowingMetadata] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      try {
        setIsLoading(true);
        const extracted = await extractMarkdown(props.url);
        const historyItem = await saveToHistory(extracted);

        if (!isCancelled) {
          setItem(historyItem);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [props.url]);

  if (error) {
    return <Detail markdown={formatErrorMarkdown(props.url, error)} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={item ? formatMarkdownForDetail(item) : formatLoadingMarkdown(props.url)}
      metadata={item && isShowingMetadata ? <MarkdownMetadata item={item} /> : undefined}
      actions={
        item ? (
          <MarkdownActions
            item={item}
            isShowingMetadata={isShowingMetadata}
            onToggleMetadata={() => setIsShowingMetadata((value) => !value)}
          />
        ) : undefined
      }
    />
  );
}

function MarkdownMetadata(props: { item: HistoryItem }) {
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

function MarkdownActions(props: { item: HistoryItem; isShowingMetadata?: boolean; onToggleMetadata?: () => void }) {
  return (
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
      {props.onToggleMetadata ? (
        <Action
          title={props.isShowingMetadata ? "Hide Details Sidebar" : "Show Details Sidebar"}
          icon={props.isShowingMetadata ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "d" },
            Windows: { modifiers: ["ctrl"], key: "d" },
          }}
          onAction={props.onToggleMetadata}
        />
      ) : null}
      <ActionPanel.Section title="History">
        <Action
          title="Remove from History"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => void (await removeFromHistory(props.item.id))}
        />
        <Action
          title="Clear History"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={async () => void (await clearHistory())}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
