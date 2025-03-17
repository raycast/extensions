import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Article {
  headline: string;
  published: string;
  type: string;
  images: { url: string }[];
  links: { web: { href: string } };
}

interface ArticlesResponse {
  articles: Article[];
}

export default function scoresAndSchedule() {
  // Fetch NFL Articles

  const [currentLeague, displaySelectLeague] = useState("NFL Articles");
  const { isLoading: nflArticlesStatus, data: nflArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news",
  );

  const nflArticles = nflArticlesData?.articles || [];
  const nflItems = nflArticles?.map((nflArticle, index) => {
    const articleDate = new Date(nflArticle?.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = nflArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${nflArticle?.headline ?? "No Headline Found"}`}
        icon={{ source: nflArticle?.images[0]?.url }}
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Date Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${nflArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch NCAA Articles

  const { isLoading: ncaaArticlesStatus, data: ncaaArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news",
  );

  const ncaaArticles = ncaaArticlesData?.articles || [];
  const ncaaItems = ncaaArticles?.map((ncaaArticle, index) => {
    const articleDate = new Date(ncaaArticle?.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = ncaaArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${ncaaArticle?.headline ?? "No Headline Found"}`}
        icon={{ source: ncaaArticle?.images[0]?.url }}
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Date Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${ncaaArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  if (nflArticlesStatus || ncaaArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder="Search for an article"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="NFL">
          <List.Dropdown.Item title="NFL" value="NFL" />
          <List.Dropdown.Item title="NCAA" value="NCAA" />
        </List.Dropdown>
      }
      isLoading={nflArticlesStatus}
    >
      {currentLeague === "NFL" && (
        <>
          <List.Section title={`${nflArticles?.length} Article${nflArticles.length !== 1 ? "s" : ""}`}>
            {nflItems}
          </List.Section>
        </>
      )}

      {currentLeague === "NCAA" && (
        <>
          <List.Section title={`${ncaaArticles?.length} Article${ncaaArticles.length !== 1 ? "s" : ""}`}>
            {ncaaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
