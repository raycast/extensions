import { Action, ActionPanel, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { WordDetail } from "./components/WordDetail";
import { lookupWord } from "./services/dictionary";
import { getFavorites } from "./storage/favorites";
import { getHistory, getStudyStats, recordHistory } from "./storage/history";
import { Favorite, HistoryItem, WordResult } from "./types/word";

const MIN_QUERY_LENGTH = 2;

type CommandArguments = {
  word?: string;
};

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const [query, setQuery] = useState(props.arguments?.word ?? "");
  const [result, setResult] = useState<WordResult>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    void refreshLocalData(setHistory, setFavorites);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const abortController = new AbortController();
    let isCurrentQuery = true;
    setError(undefined);

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setResult(undefined);
      setIsLoading(false);
      return () => {
        isCurrentQuery = false;
        abortController.abort();
      };
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      void lookupWord(normalizedQuery, abortController.signal)
        .then(async (nextResult) => {
          if (!isCurrentQuery || abortController.signal.aborted) return;

          setResult(nextResult);
          await recordHistory(nextResult.word);

          if (!isCurrentQuery || abortController.signal.aborted) return;
          await refreshLocalData(setHistory, setFavorites);
        })
        .catch((lookupError: unknown) => {
          if (!isCurrentQuery || isAbortError(lookupError)) return;

          setResult(undefined);
          setError(lookupError instanceof Error ? lookupError.message : "Lookup failed");
          void showToast({ style: Toast.Style.Failure, title: "Lookup Failed", message: String(lookupError) });
        })
        .finally(() => {
          if (isCurrentQuery) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      isCurrentQuery = false;
      abortController.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const stats = useMemo(() => getStudyStats(history), [history]);

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search English words or ops phrases, for example denied / permission denied"
    >
      {query.trim().length < MIN_QUERY_LENGTH ? (
        <HomeItems history={history} favorites={favorites} stats={stats} setQuery={setQuery} />
      ) : result ? (
        <SearchResultItem result={result} />
      ) : (
        <List.EmptyView
          title={error ? "Lookup Failed" : "Start Typing to Search"}
          description={error ?? "Search words, phrases, and operations vocabulary."}
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

type HomeItemsProps = {
  history: HistoryItem[];
  favorites: Favorite[];
  stats: ReturnType<typeof getStudyStats>;
  setQuery: (query: string) => void;
};

function HomeItems({ history, favorites, stats, setQuery }: HomeItemsProps) {
  const recentHistory = history.slice(0, 8);
  const recentFavorites = favorites.slice(0, 8);

  return (
    <>
      <List.Section title="Study Stats">
        <List.Item
          title={`Today ${stats.today} · This Week ${stats.week} · Total ${stats.total}`}
          subtitle="Enter a keyword to start searching"
          icon={Icon.BarChart}
        />
      </List.Section>
      {recentFavorites.length > 0 ? (
        <List.Section title="Favorites">
          {recentFavorites.map((favorite) => (
            <QuickSearchItem
              key={favorite.word}
              title={favorite.word}
              date={favorite.createdAt}
              icon={Icon.Star}
              setQuery={setQuery}
            />
          ))}
        </List.Section>
      ) : null}
      {recentHistory.length > 0 ? (
        <List.Section title="Recent Searches">
          {recentHistory.map((item) => (
            <QuickSearchItem
              key={item.word}
              title={item.word}
              date={item.queryTime}
              icon={Icon.Clock}
              setQuery={setQuery}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="Start Searching"
          description="Try denied, throughput, or permission denied."
          icon={Icon.Book}
        />
      )}
    </>
  );
}

type QuickSearchItemProps = {
  title: string;
  date: string;
  icon: Icon;
  setQuery: (query: string) => void;
};

function QuickSearchItem({ title, date, icon, setQuery }: QuickSearchItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={new Date(date).toLocaleString("en-US")}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setQuery(title)} />
        </ActionPanel>
      }
    />
  );
}

function SearchResultItem({ result }: { result: WordResult }) {
  const chineseMeanings = [
    ...result.definitions.map((definition) => definition.chinese).filter(isString),
    ...result.localDefinitions,
  ];
  const accessories = [
    result.techEntry ? { text: "Ops" } : undefined,
    result.phonetics[0]?.text ? { text: result.phonetics[0].text } : undefined,
  ].filter((item): item is { text: string } => item !== undefined);

  return (
    <List.Section title="Search Result">
      <List.Item
        title={result.word}
        subtitle={unique(chineseMeanings).slice(0, 3).join("; ") || "No Chinese translation found"}
        icon={result.techEntry ? Icon.Terminal : Icon.Book}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push title="Open Details" icon={Icon.Sidebar} target={<WordDetail result={result} />} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

async function refreshLocalData(
  setHistory: (history: HistoryItem[]) => void,
  setFavorites: (favorites: Favorite[]) => void,
): Promise<void> {
  const [nextHistory, nextFavorites] = await Promise.all([getHistory(), getFavorites()]);
  setHistory(nextHistory);
  setFavorites(nextFavorites);
}
