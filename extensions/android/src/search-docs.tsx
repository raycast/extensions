import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { NotInstalled } from "./components/NotInstalled";
import {
  DocsArticle,
  DocsSearchResult,
  getAndroidCliPath,
  installAndroidCli,
  runDocsFetch,
  runDocsSearch,
  toDeveloperUrl,
} from "./util/androidCli";

const DEVELOPER_DOCS_HOME = "https://developer.android.com/";

type CliState = "checking" | "missing" | "ready";

export default function Command() {
  const [cliState, setCliState] = useState<CliState>("checking");

  useEffect(() => {
    getAndroidCliPath()
      .then((path) => setCliState(path ? "ready" : "missing"))
      .catch((error) => {
        console.error("[android] Search Docs: CLI resolution failed:", error);
        setCliState("missing");
      });
  }, []);

  async function handleInstall() {
    const path = await installAndroidCli();
    if (path) {
      setCliState("ready");
    }
  }

  if (cliState === "missing") {
    return <NotInstalled onInstall={handleInstall} />;
  }

  return <SearchDocsList isLoading={cliState === "checking"} />;
}

function SearchDocsList({ isLoading }: { isLoading: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function search() {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }
    setIsSearching(true);
    try {
      const found = await runDocsSearch(trimmed);
      setResults(found);
      setHasSearched(true);
      if (found.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `No docs found for "${trimmed}"`,
        });
      }
    } catch (error) {
      console.error("[android] Search Docs: search failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Docs search failed",
        message: String(error),
      });
    } finally {
      setIsSearching(false);
    }
  }

  const searchAction = (
    <Action title="Search Docs" icon={Icon.MagnifyingGlass} onAction={search} />
  );

  return (
    <List
      isLoading={isLoading || isSearching}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type a docs query, then press Enter to search"
      throttle={false}
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={hasSearched ? "No results" : "Search the Android docs"}
          description={
            hasSearched
              ? "Try a different query, then press Enter."
              : "Type a query and press Enter to search the Android Knowledge Base."
          }
          actions={<ActionPanel>{searchAction}</ActionPanel>}
        />
      ) : (
        results.map((result) => (
          <List.Item
            key={result.url}
            icon={Icon.Document}
            title={result.title}
            subtitle={result.snippet}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Article"
                  icon={Icon.Book}
                  target={<DocsArticleDetail result={result} />}
                />
                <ActionPanel.Section>{searchAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function DocsArticleDetail({ result }: { result: DocsSearchResult }) {
  const [article, setArticle] = useState<DocsArticle | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runDocsFetch(result.url)
      .then(setArticle)
      .catch((error) => {
        console.error("[android] Search Docs: fetch article failed:", error);
        return showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load article",
          message: String(error),
        });
      })
      .finally(() => setIsLoading(false));
  }, [result.url]);

  // Only kb://android/... entries have a navigable developer.android.com page;
  // for other hosts (e.g. kb://JetBrains/...) there is no public URL to link to.
  const developerUrl = toDeveloperUrl(result.url);
  const browserUrl = developerUrl ?? DEVELOPER_DOCS_HOME;
  const title = article?.title ?? result.title;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={article?.body ?? ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          {developerUrl ? (
            <Detail.Metadata.Link
              title="Source"
              target={developerUrl}
              text={developerUrl}
            />
          ) : (
            <Detail.Metadata.Label title="Source" text={result.url} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={browserUrl} />
          {article ? (
            <Action.CopyToClipboard
              title="Copy Article"
              content={article.body}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
