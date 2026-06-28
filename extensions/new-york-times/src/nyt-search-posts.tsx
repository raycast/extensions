import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { DocsItem, NYTSearchResult } from "./search-posts-types";
import { prettifyDate } from "./utils";

const tagColors = ["#ee3835", "#a735ee", "#3588ee"];

export default function Command() {
  const apiKey = getPreferenceValues()?.api_key;

  const [query, setQuery] = useState("");

  const { isLoading, data, revalidate } = useFetch<NYTSearchResult>(
    `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${query}&api-key=${apiKey}`
  );

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={revalidate} />
        </ActionPanel>
      }
      isShowingDetail
      enableFiltering={false}
      onSearchTextChange={setQuery}
      navigationTitle="Search Articles"
      searchBarPlaceholder="Search through all NYT articles"
    >
      {data?.response.docs
        .filter((p) => p.headline.main && p.web_url)
        .map((post) => {
          return (
            <List.Item
              key={post._id}
              title={post.headline.main}
              icon={getIcon(post)}
              detail={
                <List.Item.Detail
                  markdown={generateMarkdownFromPost(post)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Author"
                        text={
                          post.byline.original ||
                          `By ${post.byline.person[0]?.firstname ?? ""} ${post.byline.person[0]?.lastname ?? ""}`
                        }
                      />
                      <List.Item.Detail.Metadata.Label title="Published" text={prettifyDate(post.pub_date)} />
                      <List.Item.Detail.Metadata.Label title="Section" text={post.section_name} />
                      {post.keywords.length > 0 ? (
                        <List.Item.Detail.Metadata.TagList title="Keywords">
                          {post.keywords.slice(0, 3).map((keyword, i) => (
                            <List.Item.Detail.Metadata.TagList.Item key={i} text={keyword.value} color={tagColors[i]} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <></>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={<ActionPanel>{<Action.OpenInBrowser url={post.web_url} />}</ActionPanel>}
            />
          );
        })}
    </List>
  );
}

const getIcon = (post: DocsItem) => {
  if (post.multimedia?.length) {
    return { source: `https://static01.nyt.com/${post.multimedia[0].url}`, mask: Image.Mask.Circle };
  }

  return Icon.Circle;
};

const generateMarkdownFromPost = (post: DocsItem): string => {
  const { headline, abstract, lead_paragraph } = post;

  return `
  # ${headline.main}\n
  ---
  **${abstract}**\n
  ${lead_paragraph != abstract ? `${lead_paragraph}\n` : ""}
  `;
};
