import { Detail, List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Article {
  headline: string;
  published: string;
  images: { url: string }[];
  links: { web: { href: string } };
}

interface ArticlesResponse {
  articles: Article[];
}

export default function scoresAndSchedule() {
  // Fetch NBA Articles

  const [currentLeague, displaySelectLeague] = useState("NBA Articles");
  const { isLoading: nbaArticlesStatus, data: nbaArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news",
  );

  const nbaArticles = nbaArticlesData?.articles || [];
  const nbaItems = nbaArticles.map((nbaArticle, index) => {
    const articleDate = new Date(nbaArticle.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${nbaArticle.headline}`}
        icon={{ source: nbaArticle.images[0].url }}
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${nbaArticle.links.web.href}`} />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch WNBA Articles

  const { isLoading: wnbaArticlesStatus, data: wnbaArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/news",
  );

  const wnbaArticles = wnbaArticlesData?.articles || [];
  const wnbaItems = wnbaArticles.map((wnbaArticle, index) => {
    const articleDate = new Date(wnbaArticle.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${wnbaArticle.headline}`}
        icon={{ source: wnbaArticle.images[0].url }}
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${wnbaArticle.links.web.href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (nbaArticlesStatus || wnbaArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder="Search for an article"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="NBA">
          <List.Dropdown.Item title="NBA" value="NBA" />
          <List.Dropdown.Item title="WNBA" value="WNBA" />
        </List.Dropdown>
      }
      isLoading={nbaArticlesStatus}
    >
      {currentLeague === "NBA" && (
        <>
          <List.Section title={`${nbaArticles.length} Article${nbaArticles.length !== 1 ? "s" : ""}`}>
            {nbaItems}
          </List.Section>
        </>
      )}

      {currentLeague === "WNBA" && (
        <>
          <List.Section title={`${wnbaArticles.length} Article${wnbaArticles.length !== 1 ? "s" : ""}`}>
            {wnbaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
