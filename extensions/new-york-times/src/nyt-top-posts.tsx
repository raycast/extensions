import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NYTTopResult, ResultsItem } from "./top-posts-types";
import { useState } from "react";
import { firstCharToUpperCase, prettifyDate } from "./utils";

const tagColors = ["#ee3835", "#a735ee", "#3588ee"];
const sections = [
  { name: "Arts", value: "arts" },
  { name: "Automobiles", value: "automobiles" },
  { name: "Books", value: "books" },
  { name: "Business", value: "business" },
  { name: "Fashion", value: "fashion" },
  { name: "Food", value: "food" },
  { name: "Health", value: "health" },
  { name: "Home", value: "home" },
  { name: "Insider", value: "insider" },
  { name: "Magazine", value: "magazine" },
  { name: "Movies", value: "movies" },
  { name: "NYRegion", value: "nyregion" },
  { name: "Obituaries", value: "obituaries" },
  { name: "Opinion", value: "opinion" },
  { name: "Politics", value: "politics" },
  { name: "Realestate", value: "realestate" },
  { name: "Science", value: "science" },
  { name: "Sports", value: "sports" },
  { name: "SundayReview", value: "sundayreview" },
  { name: "Technology", value: "technology" },
  { name: "Theater", value: "theater" },
  { name: "Travel", value: "travel" },
  { name: "Upshot", value: "upshot" },
  { name: "US", value: "us" },
  { name: "World", value: "world" },
];

export default function Command() {
  const apiKey = getPreferenceValues()?.api_key;

  const [section, setSection] = useState("politics");

  const { isLoading, data, revalidate } = useFetch<NYTTopResult>(
    `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${apiKey}`
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search top posts"
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={revalidate} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" storeValue={true} onChange={setSection}>
          {sections.map(({ name, value }) => (
            <List.Dropdown.Item key={name} title={name} value={value} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail
    >
      {data?.results
        .filter((p) => p.title && p.url)
        .map((post) => {
          return (
            <List.Item
              key={post.url}
              title={post.title}
              icon={getIcon(post)}
              detail={
                <List.Item.Detail
                  markdown={generateMarkdownFromPost(post)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Author" text={post.byline} />
                      <List.Item.Detail.Metadata.Label title="Published" text={prettifyDate(post.published_date)} />
                      <List.Item.Detail.Metadata.Label title="Section" text={firstCharToUpperCase(post.section)} />
                      {post.des_facet.length > 0 ? (
                        <List.Item.Detail.Metadata.TagList title="Keywords">
                          {post.des_facet.slice(0, 3).map((keyword, i) => (
                            <List.Item.Detail.Metadata.TagList.Item key={keyword} text={keyword} color={tagColors[i]} />
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

const getIcon = (post: ResultsItem) => {
  if (post.multimedia?.length) {
    return { source: post.multimedia[0].url, mask: Image.Mask.Circle };
  }

  return Icon.Circle;
};

const generateMarkdownFromPost = (post: ResultsItem): string => {
  const { title, abstract } = post;

  return `
  # ${title}\n
  ---
  ${abstract}\n
  `;
};
