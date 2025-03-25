import { Detail, List, Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

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
  // Fetch Soccer Articles

  const { isLoading: soccerArticlesStatus, data: soccerArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/news",
  );

  const soccerArticles = soccerArticlesData?.articles || [];
  const soccerItems = soccerArticles?.map((soccerArticle, index) => {
    const articleDate = new Date(soccerArticle?.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = soccerArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${soccerArticle?.headline}`}
        icon={
          soccerArticle?.images && soccerArticle?.images[0]?.url ? { source: soccerArticle?.images[0]?.url } : undefined
        }
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Headline Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${soccerArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
          </ActionPanel>
        }
      />
    );
  });

  if (soccerArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List searchBarPlaceholder="Search for an article" isLoading={soccerArticlesStatus}>
      <List.Section title={`${soccerArticles?.length} Article${soccerArticles?.length !== 1 ? "s" : ""}`}>
        {soccerItems}
      </List.Section>
    </List>
  );
}
