import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { WordDetail } from "./components/WordDetail";
import { lookupWord } from "./services/dictionary";
import { getFavorites } from "./storage/favorites";
import { getHistory, getStudyStats, recordHistory } from "./storage/history";
import { Favorite, HistoryItem, WordResult } from "./types/word";

const MIN_QUERY_LENGTH = 2;

export default function Command() {
  const [query, setQuery] = useState("");
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
    setError(undefined);

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setResult(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      void lookupWord(normalizedQuery)
        .then(async (nextResult) => {
          setResult(nextResult);
          await recordHistory(nextResult.word);
          await refreshLocalData(setHistory, setFavorites);
        })
        .catch((lookupError: unknown) => {
          setResult(undefined);
          setError(lookupError instanceof Error ? lookupError.message : "查询失败");
          void showToast({ style: Toast.Style.Failure, title: "查询失败", message: String(lookupError) });
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const stats = useMemo(() => getStudyStats(history), [history]);

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="输入英语单词或运维短语，例如 denied / permission denied"
    >
      {query.trim().length < MIN_QUERY_LENGTH ? (
        <HomeItems history={history} favorites={favorites} stats={stats} setQuery={setQuery} />
      ) : result ? (
        <SearchResultItem result={result} />
      ) : (
        <List.EmptyView
          title={error ? "查询失败" : "输入后开始查询"}
          description={error ?? "支持单词、短语和运维英语场景。"}
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
      <List.Section title="学习统计">
        <List.Item
          title={`今日 ${stats.today} 次 · 本周 ${stats.week} 次 · 总计 ${stats.total} 次`}
          subtitle="输入关键词开始查询"
          icon={Icon.BarChart}
        />
      </List.Section>
      {recentFavorites.length > 0 ? (
        <List.Section title="收藏">
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
        <List.Section title="查询历史">
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
          title="开始查询"
          description="输入 denied、throughput 或 permission denied。"
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
      subtitle={new Date(date).toLocaleString("zh-CN")}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title="查询" icon={Icon.MagnifyingGlass} onAction={() => setQuery(title)} />
        </ActionPanel>
      }
    />
  );
}

function SearchResultItem({ result }: { result: WordResult }) {
  const accessories = [
    result.techEntry ? { text: "运维" } : undefined,
    result.phonetics[0]?.text ? { text: result.phonetics[0].text } : undefined,
  ].filter((item): item is { text: string } => item !== undefined);

  return (
    <List.Section title="查询结果">
      <List.Item
        title={result.word}
        subtitle={result.chineseDefinitions.join("；")}
        icon={result.techEntry ? Icon.Terminal : Icon.Book}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push title="打开详情" icon={Icon.Sidebar} target={<WordDetail result={result} />} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

async function refreshLocalData(
  setHistory: (history: HistoryItem[]) => void,
  setFavorites: (favorites: Favorite[]) => void,
): Promise<void> {
  const [nextHistory, nextFavorites] = await Promise.all([getHistory(), getFavorites()]);
  setHistory(nextHistory);
  setFavorites(nextFavorites);
}
