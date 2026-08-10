import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";
import UserAgent from "user-agents";
import { Topic } from "./types/topic.types";
import type { ArticleItem } from "./types/article.types";

const BASE_URL = "https://www.thrashermagazine.com";

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [topic, setTopic] = useState("featured");
  const [showDetails, setShowDetails] = useCachedState("show-details", true);
  const [data, setData] = useState<{ featured: ArticleItem[]; junkDrawer: ArticleItem[]; searchItems: ArticleItem[] }>({
    featured: [],
    junkDrawer: [],
    searchItems: [],
  });

  const { isLoading } = useFetch(
    `${BASE_URL}${search ? `/search/${search}/` : "/tag/junk-drawer/page/0/"}` + "?json=true",
    {
      headers: {
        credentials: "include",
        "User-Agent": new UserAgent().toString(),
      },
      async parseResponse(response) {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const json = await response.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapArticleItem = (item: any) => {
          const parts = item.imageToUse.split("/mediaV2");
          const filteredImageUrl = parts.length > 1 ? "/mediaV2" + parts[1] : item.imageToUse;

          return {
            id: item.id,
            title: removeHtmlTags(item.cleanTitle ? item.cleanTitle : item.title),
            created: item.created,
            introtext: removeHtmlTags(item.introtext),
            fulltext: item.fulltext,
            imageToUse: filteredImageUrl,
            imageAlt: item.imageAlt,
            link: item.link,
          } as ArticleItem;
        };

        const featured = !search ? json.featured_content_items.map(mapArticleItem) : [];
        const junkDrawer = !search ? json.junk_drawer_items.map(mapArticleItem) : [];
        const searchItems = search ? (json.search_items || []).map(mapArticleItem) : [];

        setData({
          featured,
          junkDrawer,
          searchItems,
        });
      },
    },
  );

  const results = search ? data.searchItems : topic === "featured" ? data.featured : data.junkDrawer;

  return (
    <List
      isShowingDetail={showDetails}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search on Thrasher Magazine"
      onSearchTextChange={(newValue) => setSearch(newValue)}
      searchBarAccessory={
        !search ? (
          <List.Dropdown
            tooltip="Select News"
            defaultValue={Topic.featured}
            storeValue
            onChange={(newValue) => setTopic(newValue as Topic)}
          >
            {Object.entries(Topic).map(([name, value]) => (
              <List.Dropdown.Item key={name} title={value} value={name} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      <List.Section title={search ? "Search results for " + search : "Recent Magazines"}>
        {results?.map((article: ArticleItem) => (
          <List.Item
            key={article.link}
            title={{ value: article.title, tooltip: article.created }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${BASE_URL}${article.imageToUse}) \n\n ${article.introtext}`}
              />
            }
            actions={<Actions article={article} />}
          />
        ))}
      </List.Section>
    </List>
  );

  function removeHtmlTags(input: string) {
    return input.replace(/<\/?[^>]+(>|$)/g, "");
  }

  function Actions(props: { article: ArticleItem }) {
    return (
      <ActionPanel title={props.article.title}>
        <ActionPanel.Section>
          {props.article.link && <Action.OpenInBrowser url={BASE_URL + props.article.link} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {props.article.link && (
            <Action.CopyToClipboard
              content={BASE_URL + props.article.link}
              title="Copy Link"
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          <Action
            icon={Icon.AppWindowList}
            title={showDetails ? "Hide Details" : "Show Details"}
            onAction={() => setShowDetails((x) => !x)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
}
