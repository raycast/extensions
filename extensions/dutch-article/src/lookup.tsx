// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
} from "@raycast/api";
import { dutchWords } from "./words";

interface ArticleResult {
  word: string;
  article: "het" | "de" | "both" | "unknown";
  fullWord: string;
  source: "online" | "local";
}

interface SpellingSuggestion {
  word: string;
  article: "het" | "de" | "both";
  fullWord: string;
  distance: number;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Find similar words from the dictionary
function findSpellingSuggestions(query: string, maxDistance: number = 2): SpellingSuggestion[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (trimmedQuery.length < 3) return [];

  const suggestions: SpellingSuggestion[] = [];

  for (const [word, article] of Object.entries(dutchWords)) {
    // Only check words with similar length to avoid unnecessary calculations
    if (Math.abs(word.length - trimmedQuery.length) > maxDistance) continue;

    const distance = levenshteinDistance(trimmedQuery, word);
    if (distance > 0 && distance <= maxDistance) {
      suggestions.push({
        word,
        article,
        fullWord: article === "both" ? `het/de ${word}` : `${article} ${word}`,
        distance,
      });
    }
  }

  // Sort by distance (closest first), then alphabetically
  return suggestions
    .sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word))
    .slice(0, 5);
}

// Search for matching words in the dictionary (prefix match)
function searchWords(query: string): ArticleResult[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  const results: ArticleResult[] = [];

  // First, check for exact match
  if (dutchWords[trimmedQuery]) {
    const article = dutchWords[trimmedQuery];
    results.push({
      word: trimmedQuery,
      article,
      fullWord: article === "both" ? `het/de ${trimmedQuery}` : `${article} ${trimmedQuery}`,
      source: "local",
    });
  }

  // Then find prefix matches (limit to 10)
  for (const [word, article] of Object.entries(dutchWords)) {
    if (word.startsWith(trimmedQuery) && word !== trimmedQuery) {
      results.push({
        word,
        article,
        fullWord: article === "both" ? `het/de ${word}` : `${article} ${word}`,
        source: "local",
      });
      if (results.length >= 10) break;
    }
  }

  return results;
}

// Online lookup for words not in dictionary
async function lookupOnline(word: string): Promise<ArticleResult | null> {
  const trimmedWord = word.trim().toLowerCase();

  try {
    const response = await fetch(
      `https://welklidwoord.nl/${encodeURIComponent(trimmedWord)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          Accept: "text/html,application/xhtml+xml",
        },
      }
    );
    const html = await response.text();

    // Check if the word was not found in the database
    if (html.includes("Helaas") || html.includes("niet zo slim") || html.includes("zelfstandig naamwoord")) {
      return null; // Word not found
    }

    // Check for "Het" article - look for the answer in h2 tags or strong tags
    const isHet =
      new RegExp(`<h2[^>]*>\\s*Het\\s+${trimmedWord}`, "i").test(html) ||
      html.includes(`<strong>Het</strong>`) ||
      new RegExp(`>Het ${trimmedWord}<`, "i").test(html) ||
      new RegExp(`gebruiken wij.*?\\bhet\\s+${trimmedWord}\\b`, "i").test(html);

    // Check for "De" article - look for the answer in h2 tags or strong tags
    const isDe =
      new RegExp(`<h2[^>]*>\\s*De\\s+${trimmedWord}`, "i").test(html) ||
      html.includes(`<strong>De</strong>`) ||
      new RegExp(`>De ${trimmedWord}<`, "i").test(html) ||
      new RegExp(`gebruiken wij.*?\\bde\\s+${trimmedWord}\\b`, "i").test(html);

    if (isHet && isDe) {
      return {
        word: trimmedWord,
        article: "both",
        fullWord: `het/de ${trimmedWord}`,
        source: "online",
      };
    } else if (isHet) {
      return {
        word: trimmedWord,
        article: "het",
        fullWord: `het ${trimmedWord}`,
        source: "online",
      };
    } else if (isDe) {
      return {
        word: trimmedWord,
        article: "de",
        fullWord: `de ${trimmedWord}`,
        source: "online",
      };
    }

    return null; // Could not determine article
  } catch (error) {
    console.error("Error looking up article:", error);
    return null;
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [onlineResult, setOnlineResult] = useState<ArticleResult | null>(null);
  const [onlineSearchDone, setOnlineSearchDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Instant local search results
  const localResults = useMemo(() => {
    return searchWords(searchText);
  }, [searchText]);

  // Spelling suggestions when no results found
  const spellingSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query || query.length < 3) return [];
    // Only show suggestions if no local results and online search is done with no results
    if (localResults.length > 0) return [];
    if (!onlineSearchDone || onlineResult) return [];
    return findSpellingSuggestions(query);
  }, [searchText, localResults, onlineSearchDone, onlineResult]);

  // Check if exact match exists in local dictionary
  const hasExactLocalMatch = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return query && dutchWords[query] !== undefined;
  }, [searchText]);

  // Online lookup with debounce (only if no local match)
  useEffect(() => {
    const query = searchText.trim().toLowerCase();

    // Reset online search state when query changes
    setOnlineSearchDone(false);
    setOnlineResult(null);

    if (!query || hasExactLocalMatch) {
      return;
    }

    // Only search online if we have a complete-looking word (3+ chars) and no local results
    if (query.length < 3) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await lookupOnline(query);
        setOnlineResult(result); // Will be null if not found
      } catch (error) {
        setOnlineResult(null);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to look up article online",
        });
      } finally {
        setIsLoading(false);
        setOnlineSearchDone(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, hasExactLocalMatch]);

  const getArticleColor = (article: string): Color => {
    if (article === "het") return Color.Orange;
    if (article === "de") return Color.Blue;
    if (article === "both") return Color.Purple;
    return Color.SecondaryText;
  };

  const getArticleIcon = (article: string) => {
    if (article === "het") return Icon.CircleFilled;
    if (article === "de") return Icon.Circle;
    if (article === "both") return Icon.CircleEllipsis;
    return Icon.QuestionMarkCircle;
  };

  const renderItem = (result: ArticleResult, isExactMatch: boolean = false) => (
    <List.Item
      key={result.word}
      icon={{
        source: getArticleIcon(result.article),
        tintColor: getArticleColor(result.article),
      }}
      title={result.fullWord}
      subtitle={isExactMatch ? `✓ Exact match` : undefined}
      accessories={[
        {
          tag: {
            value: result.article.toUpperCase(),
            color: getArticleColor(result.article),
          },
        },
        result.source === "online" ? { icon: Icon.Globe, tooltip: "From welklidwoord.nl" } : {},
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Full Word"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(result.fullWord);
              showToast({
                style: Toast.Style.Success,
                title: "Copied!",
                message: result.fullWord,
              });
            }}
          />
          <Action
            title="Copy Article Only"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              const articleText = result.article === "both" ? "het/de" : result.article;
              await Clipboard.copy(articleText);
              showToast({
                style: Toast.Style.Success,
                title: "Copied!",
                message: articleText,
              });
            }}
          />
          <Action.OpenInBrowser
            title="Open in Welklidwoord.nl"
            url={`https://welklidwoord.nl/${encodeURIComponent(result.word)}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );

  const renderSuggestion = (suggestion: SpellingSuggestion) => (
    <List.Item
      key={suggestion.word}
      icon={{
        source: Icon.MagnifyingGlass,
        tintColor: Color.Yellow,
      }}
      title={suggestion.fullWord}
      subtitle={`Did you mean "${suggestion.word}"?`}
      accessories={[
        {
          tag: {
            value: suggestion.article.toUpperCase(),
            color: getArticleColor(suggestion.article),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Full Word"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(suggestion.fullWord);
              showToast({
                style: Toast.Style.Success,
                title: "Copied!",
                message: suggestion.fullWord,
              });
            }}
          />
          <Action
            title="Copy Article Only"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              const articleText = suggestion.article === "both" ? "het/de" : suggestion.article;
              await Clipboard.copy(articleText);
              showToast({
                style: Toast.Style.Success,
                title: "Copied!",
                message: articleText,
              });
            }}
          />
          <Action.OpenInBrowser
            title="Open in Welklidwoord.nl"
            url={`https://welklidwoord.nl/${encodeURIComponent(suggestion.word)}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );

  const showResults = localResults.length > 0 || onlineResult || spellingSuggestions.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a Dutch noun (e.g., huis, auto, kind)..."
      filtering={false}
    >
      {showResults ? (
        <>
          {localResults.length > 0 && (
            <List.Section title={localResults.length === 1 && localResults[0].word === searchText.trim().toLowerCase() ? "Result" : "Suggestions"}>
              {localResults.map((result, index) =>
                renderItem(result, index === 0 && result.word === searchText.trim().toLowerCase())
              )}
            </List.Section>
          )}
          {onlineResult && !hasExactLocalMatch && (
            <List.Section title="Online Result">
              {renderItem(onlineResult, true)}
            </List.Section>
          )}
          {spellingSuggestions.length > 0 && (
            <List.Section title="Did you mean...?">
              {spellingSuggestions.map(renderSuggestion)}
            </List.Section>
          )}
        </>
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={{ source: Icon.Book, tintColor: Color.Orange }}
            title="Het of De?"
            description="Type a Dutch noun to find out if it uses 'het' or 'de'"
          />
        )
      )}
    </List>
  );
}
