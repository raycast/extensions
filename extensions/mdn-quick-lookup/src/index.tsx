import {
  ActionPanel,
  Detail,
  getLocalStorageItem,
  List,
  OpenInBrowserAction,
  setLocalStorageItem,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import parse from "node-html-parser";
import TurndownService from "turndown";

export default function ArticleList() {
  const [indexes, setIndexes] = useState<IndexItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetch() {
      const indexes = await fetchIndex();
      setIndexes(indexes);
    }
    fetch();
  }, []);

  const results = query.length
    ? indexes
        .filter((index) => {
          return index.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
        })
        .slice(0, 20)
    : [];

  return (
    <List isLoading={results.length === 0} searchBarPlaceholder="Enter search query..." onSearchTextChange={setQuery}>
      {results.map((article, index) => (
        <ArticleListItem key={index} index={article} />
      ))}
    </List>
  );
}

function ArticleListItem(props: { index: IndexItem }) {
  const { index } = props;

  const { push } = useNavigation();

  return (
    <List.Item
      id={index.url}
      key={index.url}
      title={index.title}
      subtitle={index.url}
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <ActionPanel.Item title="View Details" onAction={() => push(<QueryDetail {...index} />)} />
          <OpenInBrowserAction url={generateUrl(index.url)} />
        </ActionPanel>
      }
    />
  );
}

function QueryDetail({ title, url }: { title: string; url: string }) {
  const [markdown, setMarkDown] = useState("");
  const [fetchingDetail, setFetchingDetail] = useState(true);

  useEffect(() => {
    getDetail(url).then((md: string) => {
      setMarkDown(md);
      setFetchingDetail(false);
    });
  }, [url]);

  const renderMarkdown = markdown ? markdown : `##### ${title} \n\nFetching detail...`

  return (
    <Detail
      isLoading={fetchingDetail}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={generateUrl(url)} />
        </ActionPanel>
      }
      markdown={renderMarkdown}
    />
  );
}

async function fetchIndex(): Promise<IndexItem[]> {
  try {
    const cache = await getLocalStorageItem("index");

    if (cache) {
      return JSON.parse(cache as string);
    }

    const response = await fetch("https://developer.mozilla.org/en-US/search-index.json");
    const json = await response.json();

    await setLocalStorageItem("index", JSON.stringify(json));
    return json as IndexItem[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load index");
    return Promise.resolve([]);
  }
}

async function getDetail(url: string): Promise<string> {
  const fullPath = generateUrl(url);

  try {
    const cache = await getLocalStorageItem(fullPath);

    if (cache) {
      return cache as string;
    }

    const response = await fetch(fullPath);
    const html = parse(await response.text());

    const docPart = html.querySelector("article.main-page-content");

    if (docPart) {
      const turndownService = new TurndownService();
      const td = turndownService.turndown(docPart.toString());

      setLocalStorageItem(fullPath, td);

      return td;
    }
  } catch (err) {
    //
  }

  return "";
}

function generateUrl(path: string) {
  return `https://developer.mozilla.org/${path}`;
}

type IndexItem = {
  title: string;
  url: string;
};
