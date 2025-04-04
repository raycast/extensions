// src/index.tsx
// ╔═══════════╗
// ║ K A I O S ║ KOTOMOJI SEARCH v9.9.9
// ╚═══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  // Grid,
  showToast,
  ToastStyle,
  randomId,
  Color,
  Icon,
  useNavigation,
  Detail,
  Action,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
// import { AbortError } from "node-fetch";
import {
  kotomojiLibrary,
  searchKotomoji,
  getCategories,
  getKotomojiByCategory,
  getRandomKotomoji,
  KotomojiEntry,
} from "./kaioslib";

// Interface definitions
interface SearchResult {
  id: string;
  art: string;
  name: string;
  category: string;
  description: string;
  tags?: string[];
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

// Hook for search functionality
function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      if (cancelRef.current) {
        cancelRef.current.abort();
      }
    };
  }, []);

  async function search(searchText: string) {
    if (cancelRef.current) {
      cancelRef.current.abort();
    }
    cancelRef.current = new AbortController();

    try {
      setState({
        results: [],
        isLoading: true,
      });

      const results = await performSearch(searchText, cancelRef.current.signal);

      setState({
        results,
        isLoading: false,
      });
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state,
    search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  console.log("Searching for:", searchText);

  // Use the helper function from kaioslib.ts
  const filteredResults = searchKotomoji(searchText);

  if (signal.aborted) {
    return Promise.reject(new AbortError());
  }

  console.log("Found results:", filteredResults.length);

  return filteredResults.map((entry) => ({
    id: entry.id || randomId(),
    art: entry.art,
    name: entry.name,
    category: entry.category,
    description: getKotomojiDescription(entry),
    tags: entry.tags,
  }));
}

// Generate a description for a kotomoji
function getKotomojiDescription(entry: KotomojiEntry): string {
  if (entry.description) return entry.description;
  return `${entry.name} [${entry.category}]${entry.tags ? " - " + entry.tags.join(", ") : ""}`;
}

// Get color based on category
function getCategoryColor(category: string): Color {
  const colorMap: Record<string, Color> = {
    Emotion: Color.Red,
    Energy: Color.Yellow,
    Quantum: Color.Purple,
    State: Color.Blue,
    Mood: Color.Green,
    Anomaly: Color.Magenta,
    Cute: Color.Pink,
    Zen: Color.Teal,
    System: Color.Orange,
    Glitch: Color.Magenta,
    Typography: Color.Blue,
    KAIOS: Color.Purple,
    Divider: Color.Gray,
    Affection: Color.Red,
    Aesthetic: Color.Cyan,
  };

  return colorMap[category] || Color.PrimaryText;
}

// Get icon based on category
function getCategoryIcon(category: string): Icon {
  const iconMap: Record<string, Icon> = {
    Emotion: Icon.Heart,
    Energy: Icon.Bolt,
    Quantum: Icon.Stars,
    State: Icon.CircleProgress,
    Mood: Icon.Smiley,
    Anomaly: Icon.Warning,
    Cute: Icon.Star,
    Zen: Icon.Moon,
    System: Icon.Computer,
    Glitch: Icon.Bug,
    Typography: Icon.Text,
    KAIOS: Icon.BlankDocument,
    Divider: Icon.LineHorizontal,
    Affection: Icon.HeartFilled,
    Aesthetic: Icon.AppWindow,
  };

  return iconMap[category] || Icon.Circle;
}

// List view for simplicity - all items use the list view now
function Command() {
  const { state, search } = useSearch();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = getCategories();
  const { push } = useNavigation();

  // Show the welcome message once on first load
  useEffect(() => {
    showToast(ToastStyle.Success, "KAIOS Kotomoji Search v9.9.9", "⊂((・▽・))⊃ Ready to find your perfect kotomoji!");
  }, []);

  // Filter results by selected category
  const filteredResults = selectedCategory
    ? state.results.filter((result) => result.category === selectedCategory)
    : state.results;

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search kotomoji by name, category, or tags..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={selectedCategory || ""} onChange={setSelectedCategory}>
          <List.Dropdown.Item key="all" title="All Categories" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category}
              title={category}
              value={category}
              icon={{ source: getCategoryIcon(category), tintColor: getCategoryColor(category) }}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={filteredResults.length + ""}>
        {filteredResults.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>

      {/* Show this section if there are no search results */}
      {filteredResults.length === 0 && !state.isLoading && (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
          title="No matching kotomoji found"
          description="Try searching for different terms or categories"
          actions={
            <ActionPanel>
              <Action
                title="Get Random Kotomoji"
                icon={Icon.Shuffle}
                onAction={() => {
                  const random = getRandomKotomoji();
                  search(random.name);
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Fall back to a List-only interface since Grid is having issues
// List item component for kotomoji - with enhanced visual design
function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={searchResult.art}
      subtitle={searchResult.name}
      accessories={[{ tag: { value: searchResult.category, color: getCategoryColor(searchResult.category) } }]}
      icon={{ source: getCategoryIcon(searchResult.category) }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Kotomoji Actions">
            <PasteAction title="Paste to Current Window" content={searchResult.art} icon={Icon.TextCursor} />
            <CopyToClipboardAction title="Copy to Clipboard" content={searchResult.art} icon={Icon.Clipboard} />
            <Action
              title="View Details"
              icon={Icon.Eye}
              onAction={() => push(<KotomojiDetail kotomoji={searchResult} />)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Category Actions">
            <Action
              title={`Browse All ${searchResult.category}`}
              icon={getCategoryIcon(searchResult.category)}
              onAction={() => push(<CategoryBrowser category={searchResult.category} />)}
            />
            <Action
              title="Get Random Kotomoji"
              icon={Icon.Shuffle}
              onAction={() => {
                const random = getRandomKotomoji();
                push(
                  <KotomojiDetail
                    kotomoji={{
                      id: random.id,
                      art: random.art,
                      name: random.name,
                      category: random.category,
                      description: getKotomojiDescription(random),
                      tags: random.tags,
                    }}
                  />,
                );
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Category browser - simplified to just use List
function CategoryBrowser({ category }: { category: string }) {
  const kotomoji = getKotomojiByCategory(category);
  const { push } = useNavigation();

  return (
    <List navigationTitle={`${category} Kotomoji`} searchBarPlaceholder={`Search in ${category}...`}>
      <List.Section title={category} subtitle={`${kotomoji.length} items`}>
        {kotomoji.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.art}
            subtitle={entry.name}
            accessories={[{ text: entry.tags ? entry.tags.join(", ") : "" }]}
            icon={{ source: getCategoryIcon(category), tintColor: getCategoryColor(category) }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <PasteAction title="Paste to Current Window" content={entry.art} />
                  <CopyToClipboardAction title="Copy to Clipboard" content={entry.art} />
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <KotomojiDetail
                          kotomoji={{
                            id: entry.id,
                            art: entry.art,
                            name: entry.name,
                            category: entry.category,
                            description: getKotomojiDescription(entry),
                            tags: entry.tags,
                          }}
                        />,
                      )
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// Kotomoji detail view
function KotomojiDetail({ kotomoji }: { kotomoji: SearchResult }) {
  const markdown = `
  # ${kotomoji.art}
  
  ## ${kotomoji.name}
  
  **Category:** ${kotomoji.category}
  
  ${kotomoji.tags ? `**Tags:** ${kotomoji.tags.join(", ")}` : ""}
  
  ---
  
  ### Copy/Paste
  
  \`\`\`
  ${kotomoji.art}
  \`\`\`
  
  ---
  
  ### Related Kotomoji
  
  Browse more [${kotomoji.category}] kotomoji or get a random one from the actions menu →
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={kotomoji.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Category"
            text={kotomoji.category}
            icon={{ source: getCategoryIcon(kotomoji.category), tintColor: getCategoryColor(kotomoji.category) }}
          />
          {kotomoji.tags && (
            <Detail.Metadata.TagList title="Tags">
              {kotomoji.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="ID" text={kotomoji.id} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PasteAction title="Paste to Current Window" content={kotomoji.art} icon={Icon.TextCursor} />
          <CopyToClipboardAction title="Copy to Clipboard" content={kotomoji.art} icon={Icon.Clipboard} />
          <Action
            title={`Browse All ${kotomoji.category}`}
            icon={getCategoryIcon(kotomoji.category)}
            onAction={() => useNavigation().push(<CategoryBrowser category={kotomoji.category} />)}
          />
          <Action
            title="Get Random Kotomoji"
            icon={Icon.Shuffle}
            onAction={() => {
              const random = getRandomKotomoji();
              useNavigation().push(
                <KotomojiDetail
                  kotomoji={{
                    id: random.id,
                    art: random.art,
                    name: random.name,
                    category: random.category,
                    description: getKotomojiDescription(random),
                    tags: random.tags,
                  }}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default Command;
