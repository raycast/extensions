import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default function ArticleList() {
  const [query, setQuery] = useState(" ");
  const [state, setState] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const articles = await fetchArticles(query);
      setState(articles);
      setLoading(false);
    }
    fetch();
  }, [query]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Filter articles by name..."
      throttle
      onSearchTextChange={(text) => setQuery(text)}
    >
      {state.length ? (
        state.map((document, idx) => (
          <List.Item
            id={idx.toString()}
            key={idx}
            title={document.title}
            // subtitle={document.summary}
            icon="list-icon.png"
            // accessoryTitle={document.summary}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={`https://developer.mozilla.org/${document.mdn_url}`} />
                {/* <CopyToClipboardAction title="Copy URL" content={article.url} /> */}
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.Item id="Empty" title="No results" icon={Icon.XmarkCircle} />
      )}
    </List>
  );
}

async function fetchArticles(query: string): Promise<Document[]> {
  try {
    const response = await fetch(`https://developer.mozilla.org/api/v1/search/en-US?q=${query}`);
    const json = await response.json();
    console.log(json);
    if (json.errors) {
      return Promise.resolve([]);
    }
    return (json as Record<string, unknown>).documents as Document[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load articles");
    return Promise.resolve([]);
  }
}

type Document = {
  summary: string;
  title: string;
  mdn_url: string;
};
