import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";

export default function ArticleList() {
  const [searchText, setSearchText] = useState('');
  const [state, setState] = useState<{ articles: Bookmark[] }>({ articles: [] });

  useDebouncedEffect(() => {
    async function fetch() {
      const articles = await fetchBookmarks(searchText);
      setState((oldState) => ({
        ...oldState,
        articles: articles,
      }));
    }
    fetch();
  }, 200, [searchText]);

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={state.articles.length === 0}
      searchBarPlaceholder="Filter bookmarks by name, tag, url...">
      {state.articles.map((article) => (
        <BookmarkItem key={article._id} article={article} />
      ))}
    </List>
  );
}

function BookmarkItem(props: { article: Bookmark }) {
  const article = props.article;

  return (
    <List.Item
      id={`${article._id}`}
      key={article._id}
      title={article.title}
      subtitle={article.tags.reduce((total, tag) => `#${tag}, ${total}`, '')}
      icon="list-icon.png"
      accessoryTitle={article.domain}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={article.link} />
          {article.tags.map((tag, id) => (
            <OpenInBrowserAction
              key={id}
              url={`https://app.raindrop.io/my/0/%23${encodeURIComponent(tag)}`}
              title={`Open #${tag} in raindrop`}
            />
          ))}
          <CopyToClipboardAction title="Copy URL" content={article.link} shortcut={{ key: 'c', modifiers: ['cmd', 'opt'] }} />
        </ActionPanel>
      }
    />
  );
}

interface Preferences {
  raindrop_token: string;
}

async function fetchBookmarks(search: string): Promise<Bookmark[]> {
  const { raindrop_token }: Preferences = getPreferenceValues();

  try {
    const response = await fetch(
      `https://api.raindrop.io/rest/v1/raindrops/0?search=${encodeURIComponent(search)}`,
      { headers: { Authorization: `Bearer ${raindrop_token}` } }
    );
    const json = await response.json();
    return (json as Record<string, unknown>).items as Bookmark[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load articles");
    return Promise.resolve([]);
  }
}

type Bookmark = {
  _id: string;
  title: string;
  link: string;
  type: string;
  tags: string[];
  domain: string;
};
