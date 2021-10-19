import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";

export default function ArticleList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetch() {
      if (query) {
        setIsLoading(true);
        const articles = await fetchArticles(query);
        setState(articles);
        setIsLoading(false);
      }
    }
    fetch();
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search MDN..."
      onSearchTextChange={(text) => setQuery(text)}
      throttle
    >
      {state.map((document, idx) => (
        <List.Item
          id={idx.toString()}
          key={idx}
          title={document.title}
          icon="icon.png"
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://developer.mozilla.org/${document.mdn_url}`} />
              <CopyToClipboardAction title="Copy URL" content={`https://developer.mozilla.org/${document.mdn_url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type Document = {
  title: string;
  mdn_url: string;
};

async function fetchArticles(query: string): Promise<Document[]> {
  try {
    const response = await axios.get<{ documents: Document[] }>("https://developer.mozilla.org/api/v1/search/en-US", {
      params: {
        q: query,
        sort: "best",
      },
    });
    return response.data.documents;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load MDN results");
    return Promise.resolve([]);
  }
}
