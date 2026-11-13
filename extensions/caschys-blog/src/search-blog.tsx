import { Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import ArticleActions from "./components/ArticleActions";
import ArticleListItem from "./components/ArticleListItem";
import { Article, safeParseDate, searchArticleFeed } from "./utils";

export default function SearchBlog() {
  const [searchText, setSearchText] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const query = searchText.trim();

  useEffect(() => {
    if (query.length < 2) {
      setArticles([]);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      void searchArticleFeed(query, 50)
        .then((results) => {
          if (!cancelled) {
            setArticles(results);
            setErrorMessage(undefined);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setArticles([]);
            setErrorMessage(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const sortedArticles = useMemo(
    () => [...articles].sort((a, b) => safeParseDate(b.pubDate) - safeParseDate(a.pubDate)),
    [articles],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the article archive..."
      throttle
    >
      {query.length < 2 ? (
        <List.EmptyView
          title="Search Caschys Blog"
          description="Enter at least two characters to search the public article archive."
          icon={Icon.MagnifyingGlass}
        />
      ) : errorMessage ? (
        <List.EmptyView title="Search failed" description={errorMessage} icon={Icon.ExclamationMark} />
      ) : sortedArticles.length === 0 && !isLoading ? (
        <List.EmptyView title="No matching articles" description="Try a broader search term." />
      ) : (
        <List.Section title="Archive Search" subtitle={`${sortedArticles.length} articles`}>
          {sortedArticles.map((article) => (
            <ArticleListItem
              key={article.guid || article.link}
              article={article}
              actions={<ArticleActions article={article} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
