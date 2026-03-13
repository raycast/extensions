import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NYTPopularResult, Post } from "./popular-posts-types";
import { useState } from "react";
import { prettifyDate } from "./utils";

const tagColors = ["#ee3835", "#a735ee", "#3588ee"];

const periods = [
  { name: "1 Day", value: "1" },
  { name: "7 Days", value: "7" },
  { name: "30 Days", value: "30" },
];

export default function Command() {
  const apiKey = getPreferenceValues()?.api_key;

  const [period, setPeriod] = useState("1");

  const { isLoading, data, revalidate } = useFetch<NYTPopularResult>(
    `https://api.nytimes.com/svc/mostpopular/v2/viewed/${period}.json?api-key=${apiKey}`
  );

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Reload" icon={Icon.Repeat} onAction={revalidate} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" storeValue={true} onChange={setPeriod}>
          {periods.map(({ name, value }) => (
            <List.Dropdown.Item key={name} title={name} value={value} />
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Search popular posts"
      isShowingDetail
    >
      {data?.results
        .filter((p) => p.title && p.url)
        .map((post) => {
          return (
            <List.Item
              key={post.id}
              title={post.title}
              icon={getIcon(post)}
              detail={
                <List.Item.Detail
                  markdown={generateMarkdownFromPost(post)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Author" text={post.byline} />
                      <List.Item.Detail.Metadata.Label title="Published" text={prettifyDate(post.published_date)} />
                      <List.Item.Detail.Metadata.Label title="Section" text={post.section} />
                      {post.adx_keywords ? (
                        <List.Item.Detail.Metadata.TagList title="Keywords">
                          {post.adx_keywords
                            .split(";")
                            .slice(0, 3)
                            .map((keyword, i) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={keyword}
                                text={keyword}
                                color={tagColors[i]}
                              />
                            ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <></>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={post.url} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

const getIcon = (post: Post) => {
  if (post.media?.length && post.media[0]["media-metadata"].length) {
    return { source: post.media[0]["media-metadata"][0].url, mask: Image.Mask.Circle };
  }

  return Icon.Circle;
};

const generateMarkdownFromPost = (post: Post): string => {
  const { title, abstract } = post;

  return `
  # ${title}\n
  ---
  ${abstract}\n
  `;
};
