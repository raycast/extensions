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
  // Fetch Men's NCAA Articles

  const [currentLeague, displaySelectLeague] = useState("Men's NCAA Games");
  const { isLoading: mncaaArticlesStatus, data: mncaaArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news",
  );

  const mncaaArticles = mncaaArticlesData?.articles || [];
  const mncaaItems = mncaaArticles?.map((mncaaArticle, index) => {
    const articleDate = new Date(mncaaArticle?.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = mncaaArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${mncaaArticle?.headline ?? "No Headline Found"}`}
        icon={{ source: mncaaArticle?.images[0]?.url }}
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Date Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${mncaaArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  // Fetch Women's NCAA Articles

  const { isLoading: wncaaArticlesStatus, data: wncaaArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/news",
  );

  const wncaaArticles = wncaaArticlesData?.articles || [];
  const wncaaItems = wncaaArticles?.map((wncaaArticle, index) => {
    const articleDate = new Date(wncaaArticle?.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = wncaaArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${wncaaArticle?.headline ?? "No Headline Found"}`}
        icon={{ source: wncaaArticle?.images[0]?.url }}
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Date Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${wncaaArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  if (mncaaArticlesStatus || wncaaArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List
      searchBarPlaceholder="Search for an article"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="MNCAA">
          <List.Dropdown.Item title="Men's NCAA" value="MNCAA" />
          <List.Dropdown.Item title="Women's NCAA" value="WNCAA" />
        </List.Dropdown>
      }
      isLoading={mncaaArticlesStatus}
    >
      {currentLeague === "MNCAA" && (
        <>
          <List.Section title={`${mncaaArticles?.length} Article${mncaaArticles?.length !== 1 ? "s" : ""}`}>
            {mncaaItems}
          </List.Section>
        </>
      )}

      {currentLeague === "WNCAA" && (
        <>
          <List.Section title={`${wncaaArticles?.length} Article${wncaaArticles?.length !== 1 ? "s" : ""}`}>
            {wncaaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
