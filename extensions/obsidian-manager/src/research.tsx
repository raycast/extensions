import { ActionPanel, Action, List, Form, Detail, showToast, Toast, useNavigation, Icon, Color } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { useCachedState } from "@raycast/utils";
import { searchForSources, SourceResult, SearchResult } from "./lib/search";
import {
  getVaultStructure,
  extractUrlContent,
  processDocument,
  applyChanges,
  saveIngestedSource,
  saveUndoRecord,
  modeToString,
  getModeDescription,
  ResearchMode,
  isYouTubeUrl,
  transcribeYouTube,
} from "./lib/ingest";

interface RecentSearch {
  query: string;
  mode: ResearchMode;
  timestamp: string;
  sourceCount: number;
}

interface FormValues {
  query: string;
  deep: boolean;
  expert: boolean;
  concierge: boolean;
}

export default function Command() {
  const { push } = useNavigation();
  const [recentSearches, setRecentSearches] = useCachedState<RecentSearch[]>("recent-research-searches", []);

  function openSearch(query: string, mode: ResearchMode) {
    push(<SourceSearch query={query} mode={mode} onSearchComplete={saveRecentSearch} />);
  }

  function saveRecentSearch(query: string, mode: ResearchMode, sourceCount: number) {
    const newSearch: RecentSearch = {
      query,
      mode,
      timestamp: new Date().toISOString(),
      sourceCount,
    };

    // Remove duplicate if exists, add to front, keep max 10
    const filtered = recentSearches.filter((s) => !(s.query === query && modeToString(s.mode) === modeToString(mode)));
    setRecentSearches([newSearch, ...filtered].slice(0, 10));
  }

  function removeSearch(search: RecentSearch) {
    setRecentSearches(
      recentSearches.filter((s) => !(s.query === search.query && modeToString(s.mode) === modeToString(search.mode))),
    );
  }

  function clearAllSearches() {
    setRecentSearches([]);
  }

  function startNewSearch() {
    push(<NewSearchForm onSubmit={openSearch} />);
  }

  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <List searchBarPlaceholder="Filter recent searches...">
      <List.Section title="Actions">
        <List.Item
          title="New Research Query"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          subtitle="Search for sources on a new topic"
          actions={
            <ActionPanel>
              <Action title="New Search" icon={Icon.MagnifyingGlass} onAction={startNewSearch} />
            </ActionPanel>
          }
        />
      </List.Section>

      {recentSearches.length > 0 && (
        <List.Section title="Recent Searches" subtitle="Click to resume">
          {recentSearches.map((search, index) => (
            <List.Item
              key={`${search.query}-${search.timestamp}`}
              title={search.query}
              subtitle={getModeDescription(search.mode)}
              icon={Icon.Clock}
              accessories={[
                { text: `${search.sourceCount} sources` },
                { text: formatDate(search.timestamp), tooltip: new Date(search.timestamp).toLocaleString() },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Resume Search"
                    icon={Icon.ArrowRight}
                    onAction={() => openSearch(search.query, search.mode)}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => removeSearch(search)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                  {index === 0 && recentSearches.length > 1 && (
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={clearAllSearches}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface NewSearchFormProps {
  onSubmit: (query: string, mode: ResearchMode) => void;
}

function NewSearchForm({ onSubmit }: NewSearchFormProps) {
  function handleSubmit(values: FormValues) {
    if (!values.query.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No query provided",
        message: "Enter a research question",
      });
      return;
    }

    const mode: ResearchMode = {
      deep: values.deep,
      expert: values.expert,
      concierge: values.concierge,
    };

    onSubmit(values.query, mode);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search for Sources" onSubmit={handleSubmit} icon={Icon.MagnifyingGlass} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Research Query"
        placeholder="What was the single stock of food for Roman legions and why did they use it?"
        info="Search for articles, videos, books, and other sources on this topic"
      />

      <Form.Separator />

      <Form.Description title="Research Modes" text="Affects how sources are evaluated and selected" />

      <Form.Checkbox
        id="deep"
        label="Deep Dive"
        info="Find obscure sources, niche debates, lesser-known experts"
        defaultValue={false}
      />

      <Form.Checkbox
        id="expert"
        label="Expert Accuracy"
        info="Prioritize academic and expert sources with citations"
        defaultValue={false}
      />

      <Form.Checkbox
        id="concierge"
        label="Research Concierge"
        info="Include suggestions for further research directions"
        defaultValue={true}
      />
    </Form>
  );
}

interface SourceSearchProps {
  query: string;
  mode: ResearchMode;
  onSearchComplete?: (query: string, mode: ResearchMode, sourceCount: number) => void;
}

function SourceSearch({ query, mode, onSearchComplete }: SourceSearchProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  // Use cached state to persist results when navigating away (e.g., opening browser)
  const cacheKey = `research-${query}-${modeToString(mode)}`;
  const [searchResult, setSearchResult] = useCachedState<SearchResult | null>(cacheKey, null);
  const [selectedUrls, setSelectedUrls] = useCachedState<string[]>(`${cacheKey}-selected`, []);
  const [error, setError] = useState<string | null>(null);
  const hasSearched = useRef(false);

  // Convert array to Set for easier operations
  const selectedSources = new Set(selectedUrls);

  const modeDesc = getModeDescription(mode);

  useEffect(() => {
    // Skip if we already have cached results or already searched this session
    if (searchResult || hasSearched.current) {
      setIsLoading(false);
      return;
    }

    hasSearched.current = true;

    async function search() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Searching...",
          message: query.slice(0, 50),
        });

        const result = await searchForSources(query, mode);
        setSearchResult(result);

        // Save to recent searches
        onSearchComplete?.(query, mode, result.sources.length);

        await showToast({
          style: Toast.Style.Success,
          title: "Search Complete",
          message: `Found ${result.sources.length} sources`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [query, mode, searchResult]);

  function toggleSource(url: string) {
    if (selectedSources.has(url)) {
      setSelectedUrls(selectedUrls.filter((u) => u !== url));
    } else {
      setSelectedUrls([...selectedUrls, url]);
    }
  }

  function selectAll() {
    if (searchResult) {
      setSelectedUrls(searchResult.sources.map((s) => s.url));
    }
  }

  function selectNone() {
    setSelectedUrls([]);
  }

  function ingestSelected() {
    if (!searchResult || selectedSources.size === 0) return;

    const sourcesToIngest = searchResult.sources.filter((s) => selectedSources.has(s.url));
    push(<IngestSources sources={sourcesToIngest} query={query} mode={mode} />);
  }

  function getTypeIcon(type: string): { source: Icon; tintColor: Color } {
    switch (type) {
      case "video":
        return { source: Icon.Video, tintColor: Color.Red };
      case "blog":
        return { source: Icon.Pencil, tintColor: Color.Blue };
      case "paper":
        return { source: Icon.Document, tintColor: Color.Green };
      case "book":
        return { source: Icon.Book, tintColor: Color.Purple };
      case "article":
        return { source: Icon.TextDocument, tintColor: Color.Orange };
      default:
        return { source: Icon.Link, tintColor: Color.SecondaryText };
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Search Error\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} onAction={() => setError(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter sources..."
      navigationTitle={`Sources for: ${query.slice(0, 30)}...`}
    >
      {searchResult && (
        <>
          <List.Section title={`Summary`} subtitle={modeDesc}>
            <List.Item
              title={searchResult.summary}
              icon={Icon.Info}
              accessories={[{ text: `${selectedSources.size}/${searchResult.sources.length} selected` }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Ingest ${selectedSources.size} Selected`}
                    icon={Icon.Download}
                    onAction={ingestSelected}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title="Select All"
                    icon={Icon.CheckCircle}
                    onAction={selectAll}
                    shortcut={{ modifiers: ["cmd"], key: "a" }}
                  />
                  <Action
                    title="Select None"
                    icon={Icon.Circle}
                    onAction={selectNone}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Sources (${searchResult.sources.length})`}>
            {searchResult.sources.map((source, index) => {
              const isSelected = selectedSources.has(source.url);
              const icon = getTypeIcon(source.type);

              return (
                <List.Item
                  key={`${source.url}-${index}`}
                  title={source.title}
                  subtitle={source.description}
                  icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : icon}
                  accessories={[
                    { tag: { value: source.type, color: icon.tintColor } },
                    { icon: isSelected ? Icon.Check : undefined },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => toggleSource(source.url)}
                      />
                      <Action
                        title={`Ingest ${selectedSources.size} Selected`}
                        icon={Icon.Download}
                        onAction={ingestSelected}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={source.url}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={source.url}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        onAction={selectAll}
                        shortcut={{ modifiers: ["cmd"], key: "a" }}
                      />
                      <Action
                        title="Select None"
                        icon={Icon.Circle}
                        onAction={selectNone}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface IngestSourcesProps {
  sources: SourceResult[];
  query: string;
  mode: ResearchMode;
}

interface IngestStatus {
  url: string;
  title: string;
  status: "pending" | "processing" | "success" | "error";
  message?: string;
}

function IngestSources({ sources, query, mode }: IngestSourcesProps) {
  const [statuses, setStatuses] = useState<IngestStatus[]>(
    sources.map((s) => ({ url: s.url, title: s.title, status: "pending" })),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function startIngestion() {
    setIsProcessing(true);

    const vault = await getVaultStructure();

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];

      setStatuses((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: "processing" };
        return updated;
      });

      try {
        let content: string;
        let title: string;

        if (isYouTubeUrl(source.url)) {
          const transcription = await transcribeYouTube(source.url);
          content = transcription.transcription;
          title = `${transcription.title} (${transcription.channel})`;
        } else {
          const extracted = await extractUrlContent(source.url);
          content = extracted.content;
          title = extracted.title;
        }

        const result = await processDocument(content, title, vault, mode);
        const { created, updated, undo } = await applyChanges(result, {
          path: source.url,
          name: title,
          isUrl: true,
        });

        await saveUndoRecord(undo);
        await saveIngestedSource({
          id: source.url,
          type: "url",
          timestamp: new Date().toISOString(),
          title: title,
          mode: modeToString(mode),
        });

        setStatuses((prev) => {
          const updated_statuses = [...prev];
          updated_statuses[i] = {
            ...updated_statuses[i],
            status: "success",
            message: `Created ${created.length}, updated ${updated.length}`,
          };
          return updated_statuses;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setStatuses((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "error", message: errorMessage };
          return updated;
        });
      }

      // Small delay between sources
      if (i < sources.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setIsComplete(true);

    const successCount = statuses.filter((s) => s.status === "success").length;
    await showToast({
      style: Toast.Style.Success,
      title: "Ingestion Complete",
      message: `Processed ${successCount}/${sources.length} sources`,
    });
  }

  // Build markdown summary
  let markdown = `# Ingesting ${sources.length} Sources\n\n`;
  markdown += `**Research Query:** ${query}\n\n---\n\n`;

  for (const status of statuses) {
    const icon =
      status.status === "success"
        ? "✅"
        : status.status === "error"
          ? "❌"
          : status.status === "processing"
            ? "⏳"
            : "⬜";

    markdown += `${icon} **${status.title}**`;
    if (status.message) {
      markdown += ` - ${status.message}`;
    }
    markdown += "\n\n";
  }

  if (isComplete) {
    const successCount = statuses.filter((s) => s.status === "success").length;
    const errorCount = statuses.filter((s) => s.status === "error").length;
    markdown += `---\n\n**Complete:** ${successCount} succeeded, ${errorCount} failed`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          {!isProcessing && !isComplete && (
            <Action title="Start Ingestion" icon={Icon.Play} onAction={startIngestion} />
          )}
        </ActionPanel>
      }
    />
  );
}
