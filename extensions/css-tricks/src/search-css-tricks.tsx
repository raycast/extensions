import html2md from "html-to-md";
import { useMemo, useState } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

type ResultItem = {
  id: number;
  title: string;
  url: string;
  subtype: "page" | "post";
};

type DetailItem = {
  date: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  jetpack_featured_media_url: string;
};

const ItemDetails = ({ item, showContent }: { item: ResultItem; showContent: boolean }) => {
  const { data, isLoading, error } = useFetch<DetailItem>(
    `https://css-tricks.com/wp-json/wp/v2/${item.subtype}s/${item.id}?embed`,
  );

  const title = data?.title?.rendered ? html2md(data.title.rendered) : "";
  const text = showContent
    ? data?.content?.rendered
      ? html2md(data.content.rendered)
      : ""
    : data?.excerpt?.rendered
      ? html2md(data.excerpt.rendered)
      : "";
  const dateString = data?.date ? new Date(data.date).toLocaleDateString() : "";
  const image = useMemo(() => {
    if (showContent) {
      return "";
    }
    if (data?.jetpack_featured_media_url) {
      let url = data.jetpack_featured_media_url;
      if (url.includes("?")) {
        url = url.split("?")[0].concat("?fit=300%2C150&ssl=1");
      }
      return `\n\n![Image](${url})`;
    }
    return "";
  }, [data?.jetpack_featured_media_url, showContent]);

  const markdown = isLoading
    ? "Loading..."
    : error
      ? error.message
      : data
        ? `## ${title} ${image} \n\n Date: \`${dateString}\` \n\n Type: _${item.subtype}_ \n\n --- \n\n ${text}`
        : "";
  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />;
};

const ListItem = ({
  item,
  toggleDetails,
  showDetails,
  toggleShowContent,
  showContent,
}: {
  item: ResultItem;
  toggleDetails: () => void;
  showDetails: boolean;
  toggleShowContent: () => void;
  showContent: boolean;
}) => {
  return (
    <List.Item
      id={`${item.id}`}
      title={html2md(item.title)}
      icon={
        item.subtype === "page"
          ? { source: Icon.Document, tintColor: Color.Green }
          : { source: Icon.Bookmark, tintColor: Color.SecondaryText }
      }
      actions={
        <ActionPanel>
          {showDetails ? (
            <>
              <Action.OpenInBrowser url={item.url} title="Open in Browser" icon={Icon.Globe} />
              <Action
                icon={Icon.Document}
                title={showContent ? "Only Show Excerpt" : "Show Full Article"}
                onAction={() => toggleShowContent()}
              />
              <Action icon={Icon.Eye} title="View Details" onAction={() => toggleDetails()} />
            </>
          ) : (
            <>
              <Action icon={Icon.Eye} title="View Details" onAction={() => toggleDetails()} />
              <Action.OpenInBrowser url={item.url} title="Open in Browser" icon={Icon.Globe} />
            </>
          )}
        </ActionPanel>
      }
      detail={showDetails ? <ItemDetails item={item} showContent={showContent} /> : undefined}
    />
  );
};

const Command = () => {
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const url = useMemo(() => {
    const searchParams = new URLSearchParams({
      search: query,
      per_page: "20",
      _fields: "id,title,url,type,subtype",
    });
    return `https://css-tricks.com/wp-json/wp/v2/search?${searchParams.toString()}`;
  }, [query]);

  const { data, isLoading, error } = useFetch(url, {
    mapResult(result: ResultItem[]) {
      return {
        data: result,
      };
    },
    execute: query.length > 0,
    keepPreviousData: false,
    onError(error) {
      showFailureToast("Failed to load data", error);
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search posts and pages"
      isShowingDetail={showDetails && query.length > 0}
    >
      {error && (
        <List.EmptyView title="Failed to load data" description={error.message} icon={{ source: "csstricks.svg" }} />
      )}
      {!error && !isLoading && query.length > 0
        ? data?.map((res) => (
            <ListItem
              key={res.id}
              item={res}
              toggleDetails={() => setShowDetails((s) => !s)}
              showDetails={showDetails && query.length > 0}
              toggleShowContent={() => setShowContent((s) => !s)}
              showContent={showContent}
            />
          ))
        : null}
      {!error && (
        <List.EmptyView
          title={
            query.length > 0
              ? isLoading
                ? "Loading data..."
                : "No results found"
              : "Start searching by typing in the search bar above"
          }
          icon={{ source: "csstricks.svg" }}
        />
      )}
    </List>
  );
};

export default Command;
