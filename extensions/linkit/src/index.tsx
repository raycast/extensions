import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  getSelectedText,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { searchDuckDuckGo } from "./duckduckgo";
import type { SearchResult } from "./types";
import {
  formatResultsAsMarkdown,
  formatResultsAsMarkdownCards,
  formatResultsAsHtmlCards,
  formatSingleAsMarkdownLink,
  formatSingleAsMarkdownCard,
} from "./utils";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const text = await getSelectedText();
        if (!text.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No text selected",
          });
          setIsLoading(false);
          return;
        }
        setQuery(text.trim());
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot read selected text",
          message: "Select some text before running this command",
        });
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await searchDuckDuckGo(query);
        if (!cancelled) {
          setResults(data);
          if (data.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No results found",
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "All search engines failed",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const toggleSelect = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(results.map((r) => r.url)));
  }, [results]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const pasteSelected = useCallback(async () => {
    const chosen = results.filter((r) => selected.has(r.url));
    if (chosen.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No results selected",
      });
      return;
    }
    await Clipboard.paste(formatResultsAsMarkdown(chosen));
    await closeMainWindow();
  }, [results, selected]);

  const pasteSelectedAsMarkdownCards = useCallback(async () => {
    const chosen = results.filter((r) => selected.has(r.url));
    if (chosen.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No results selected",
      });
      return;
    }
    await Clipboard.paste(formatResultsAsMarkdownCards(chosen));
    await closeMainWindow();
  }, [results, selected]);

  const pasteSelectedAsHtmlCards = useCallback(async () => {
    const chosen = results.filter((r) => selected.has(r.url));
    if (chosen.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No results selected",
      });
      return;
    }
    await Clipboard.paste(formatResultsAsHtmlCards(chosen));
    await closeMainWindow();
  }, [results, selected]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Refine search..."
      navigationTitle={query ? `LinkIt: "${query}"` : "LinkIt"}
      onSearchTextChange={(text) => {
        if (text && text !== query) setQuery(text);
      }}
      throttle
    >
      {selected.size > 0 && (
        <List.Section title={`${selected.size} selected`}>
          <List.Item
            title={`Paste ${selected.size} link${selected.size > 1 ? "s" : ""}`}
            icon={Icon.Clipboard}
            detail={
              <List.Item.Detail
                markdown={`**${selected.size} link${selected.size > 1 ? "s" : ""} selected.** Press ↵ to paste.`}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Paste Selected Links"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: [], key: "return" }}
                    onAction={pasteSelected}
                  />
                  <Action
                    title="Paste as Markdown Cards"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    onAction={pasteSelectedAsMarkdownCards}
                  />
                  <Action
                    title="Paste as Html Embed Cards"
                    icon={Icon.Code}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={pasteSelectedAsHtmlCards}
                  />
                  <Action
                    title="Deselect All"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={deselectAll}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy as Markdown Links"
                    content={formatResultsAsMarkdown(
                      results.filter((r) => selected.has(r.url)),
                    )}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy as Markdown Cards"
                    content={formatResultsAsMarkdownCards(
                      results.filter((r) => selected.has(r.url)),
                    )}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Results">
        {results.map((result) => {
          const isSelected = selected.has(result.url);
          const hostname = new URL(result.url).hostname;
          const faviconIcon: Image.ImageLike = {
            source: `https://${hostname}/favicon.ico`,
            fallback: Icon.Globe,
            mask: Image.Mask.RoundedRectangle,
          };
          return (
            <List.Item
              key={result.url}
              title={result.title}
              icon={
                isSelected
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : faviconIcon
              }
              accessories={[]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Title"
                        text={result.title}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Source"
                        text={hostname}
                        icon={Icon.Globe}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Engine"
                        text={result.engine}
                        icon={Icon.MagnifyingGlass}
                      />
                      <List.Item.Detail.Metadata.Link
                        title="URL"
                        target={result.url}
                        text={result.url}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Snippet"
                        text={result.snippet || "—"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={isSelected ? "Deselect" : "Select"}
                      icon={isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
                      shortcut={{ modifiers: ["opt"], key: "space" }}
                      onAction={() => toggleSelect(result.url)}
                    />
                    <Action
                      title="Paste Selected Links"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: [], key: "return" }}
                      onAction={pasteSelected}
                    />
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                      onAction={selectAll}
                    />
                    <Action
                      title="Deselect All"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={deselectAll}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={result.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={result.title}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy as Markdown Link"
                      content={formatSingleAsMarkdownLink(result)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy as Markdown Card"
                      content={formatSingleAsMarkdownCard(result)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Open">
                    <Action.OpenInBrowser
                      url={result.url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
