import html2md from "html-to-md";
import { useMemo } from "react";

import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { DetailItem, ResultItem } from "@/types";

export const ItemDetails = ({ item, showContent }: { item: ResultItem; showContent: boolean }) => {
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
