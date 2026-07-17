import { useState, useEffect, useRef, useCallback } from "react";
import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Color,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  getPreferences,
  getMaxResults,
  getMaxContentLength,
} from "./lib/preferences";
import { streamChat, type ChatMessage } from "./lib/ollama-client";
import { research, type ResearchSource } from "./lib/research-agent";
import { fetchAndExtract } from "./lib/content-extractor";
import {
  buildResearchPrompt,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
} from "./lib/prompts";
import {
  getHistory,
  saveToHistory,
  deleteFromHistory,
  clearHistory,
  formatDate,
  formatFullDate,
  type HistoryEntry,
} from "./lib/history";

// --- Helpers ---

function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatSourcesMarkdown(
  sources: readonly ResearchSource[] | readonly string[],
): string {
  if (!sources || sources.length === 0) return "";
  const items = sources
    .map((s, i) => {
      if (typeof s === "string") return `${i + 1}. [${s}](${s})`;
      return `${i + 1}. [${s.title}](${s.url})`;
    })
    .join("\n");
  return `\n\n---\n\n## Sources\n\n${items}`;
}

// --- Main Command: Ask Web ---

export default function AskWeb() {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const { data: history, isLoading, revalidate } = usePromise(getHistory);

  const isUrl = isValidUrl(searchText.trim());
  const trimmed = searchText.trim();

  const handleExecute = useCallback(() => {
    if (trimmed.length === 0) return;
    if (isUrl) {
      push(<AnalysisDetail url={trimmed} />);
    } else {
      push(<ResearchDetail query={trimmed} />);
    }
  }, [trimmed, isUrl, push]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFromHistory(id);
      await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
      revalidate();
    },
    [revalidate],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message:
        "This will permanently delete all search history. This cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
      revalidate();
    }
  }, [revalidate]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Ask anything or paste a URL..."
      onSearchTextChange={setSearchText}
      isShowingDetail={trimmed.length === 0 && (history?.length ?? 0) > 0}
    >
      {trimmed.length > 0 && (
        <List.Section title="Actions">
          <List.Item
            title={isUrl ? `Analyze URL: ${trimmed}` : `Ask Web: ${trimmed}`}
            icon={isUrl ? Icon.Link : Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title={isUrl ? "Analyze" : "Ask"}
                  icon={Icon.Message}
                  onAction={handleExecute}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="History" subtitle={`${history?.length ?? 0} items`}>
        {history?.map((entry) => {
          const detailMarkdown = `# ${entry.query}\n\n*${formatFullDate(entry.timestamp)}*\n\n---\n\n${entry.response}${formatSourcesMarkdown(entry.sources)}`;
          return (
            <List.Item
              key={entry.id}
              title={entry.query}
              subtitle={formatDate(entry.timestamp)}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              accessories={
                trimmed.length === 0
                  ? [
                      {
                        text: `${entry.sources.length} sources`,
                        icon: Icon.Globe,
                      },
                    ]
                  : undefined
              }
              detail={
                trimmed.length === 0 ? (
                  <List.Item.Detail markdown={detailMarkdown} />
                ) : undefined
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(
                          <Detail
                            navigationTitle={entry.query}
                            markdown={detailMarkdown}
                            actions={
                              <ActionPanel>
                                <Action.CopyToClipboard
                                  title="Copy Result"
                                  content={entry.response}
                                  icon={Icon.Clipboard}
                                />
                                <Action
                                  title="Re-run Search"
                                  icon={Icon.ArrowClockwise}
                                  onAction={() =>
                                    push(<ResearchDetail query={entry.query} />)
                                  }
                                />
                              </ActionPanel>
                            }
                          />,
                        )
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Result"
                      content={entry.response}
                      icon={Icon.Clipboard}
                    />
                    <Action
                      title="Re-run Search"
                      icon={Icon.ArrowClockwise}
                      onAction={() =>
                        push(<ResearchDetail query={entry.query} />)
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {entry.sources.map((url) => (
                      <Action.OpenInBrowser
                        key={url}
                        title={`Open ${new URL(url).hostname}`}
                        url={url}
                        icon={Icon.Globe}
                      />
                    ))}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(entry.id)}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={handleClearAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {trimmed.length === 0 && (history?.length ?? 0) === 0 && (
        <List.EmptyView
          title="No History Yet"
          description="Type a query or paste a URL to ask the web"
          icon={Icon.Globe}
        />
      )}
    </List>
  );
}

// --- Research Detail (Ask Web Flow) ---

function ResearchDetail({ query }: { query: string }) {
  const [markdown, setMarkdown] = useState(
    "## Researching…\n\nSearching the web for information…",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<readonly ResearchSource[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    runResearch(
      query,
      controller.signal,
      setMarkdown,
      setSources,
      setIsLoading,
    );
    return () => controller.abort();
  }, [query]);

  const fullMarkdown = `# ${query}\n\n${markdown}${formatSourcesMarkdown(sources)}`;

  return (
    <Detail
      markdown={fullMarkdown}
      isLoading={isLoading}
      navigationTitle={query}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Answer"
            content={fullMarkdown}
            icon={Icon.Clipboard}
          />
          {sources.length > 0 && (
            <ActionPanel.Section title="Sources">
              {sources.map((source) => (
                <Action.OpenInBrowser
                  key={source.url}
                  title={`Open ${source.title}`}
                  url={source.url}
                  icon={Icon.Globe}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

async function runResearch(
  query: string,
  signal: AbortSignal,
  setMarkdown: (updater: string | ((prev: string) => string)) => void,
  setSources: (sources: readonly ResearchSource[]) => void,
  setIsLoading: (loading: boolean) => void,
) {
  const prefs = getPreferences();
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Searching the web…",
    });

    const context = await research(
      query,
      {
        searxngUrl: prefs.searxngUrl,
        maxResults: getMaxResults(prefs),
        maxContentLength: getMaxContentLength(prefs),
      },
      signal,
    );

    if (signal.aborted) return;
    setSources(context.sources);

    if (context.sources.length === 0) {
      setMarkdown(
        "No results found. Attempting to answer directly using Ollama...",
      );
      // Fallback to chat without sources
      const messages: ChatMessage[] = [
        ...buildChatSystemPrompt(),
        { role: "user", content: query },
      ];
      await generateResponse(messages, prefs, signal, setMarkdown, query, []);
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Generating AI response…",
    });
    const messages = buildResearchPrompt(context.contextText, query);
    await generateResponse(
      messages,
      prefs,
      signal,
      setMarkdown,
      query,
      context.sources,
    );
  } catch (error) {
    if (signal.aborted) return;
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    setMarkdown(`## Error\n\n${message}`);
    await showToast({
      style: Toast.Style.Failure,
      title: "Research failed",
      message,
    });
  } finally {
    if (!signal.aborted) setIsLoading(false);
  }
}

// --- Analysis Detail (URL Flow) ---

function AnalysisDetail({ url }: { url: string }) {
  const [markdown, setMarkdown] = useState(
    "## Analyzing URL…\n\nFetching and extracting content…",
  );
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    runAnalysis(url, controller.signal, setMarkdown, setIsLoading);
    return () => controller.abort();
  }, [url]);

  const fullMarkdown = `# Analysis: ${url}\n\n${markdown}`;

  return (
    <Detail
      markdown={fullMarkdown}
      isLoading={isLoading}
      navigationTitle="URL Analysis"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Analysis"
            content={fullMarkdown}
            icon={Icon.Clipboard}
          />
          <Action.OpenInBrowser
            title="Open URL in Browser"
            url={url}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

async function runAnalysis(
  url: string,
  signal: AbortSignal,
  setMarkdown: (updater: string | ((prev: string) => string)) => void,
  setIsLoading: (loading: boolean) => void,
) {
  const prefs = getPreferences();
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching page content…",
    });
    const extracted = await fetchAndExtract(url, getMaxContentLength(prefs));

    if (signal.aborted) return;

    if (!extracted || extracted.content.trim().length === 0) {
      setMarkdown(
        "## Could not extract content\n\nThe page could not be fetched or has no readable content.",
      );
      setIsLoading(false);
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing with AI…",
    });
    const messages = buildAnalysisPrompt(extracted.content, url);
    await generateResponse(
      messages,
      prefs,
      signal,
      setMarkdown,
      `Analyze: ${url}`,
      [{ title: extracted.title, url, content: "" }],
    );
  } catch (error) {
    if (signal.aborted) return;
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    setMarkdown(`## Error\n\n${message}`);
    await showToast({
      style: Toast.Style.Failure,
      title: "Analysis failed",
      message,
    });
  } finally {
    if (!signal.aborted) setIsLoading(false);
  }
}

// --- Common Response Generator & Saver ---

async function generateResponse(
  messages: readonly ChatMessage[],
  prefs: ReturnType<typeof getPreferences>,
  signal: AbortSignal,
  setMarkdown: (updater: string | ((prev: string) => string)) => void,
  query: string,
  sources: readonly ResearchSource[],
) {
  let accumulated = "";
  setMarkdown("");

  const fullResponse = await streamChat(
    prefs.ollamaUrl,
    prefs.defaultModel,
    messages,
    (token: string) => {
      if (signal.aborted) return;
      accumulated += token;
      setMarkdown(accumulated);
    },
    signal,
  );

  if (signal.aborted) return;

  setMarkdown(fullResponse);
  await showToast({ style: Toast.Style.Success, title: "Done" });

  const historyEntry: HistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    query,
    response: fullResponse,
    sources: sources.map((s) => s.url),
    timestamp: Date.now(),
  };
  await saveToHistory(historyEntry);
}
