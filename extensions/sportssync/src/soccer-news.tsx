import { Detail, List, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

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
  // Fetch Soccer Articles

  const { isLoading: soccerArticlesStatus, data: soccerArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/news",
  );

  const soccerArticles = soccerArticlesData?.articles || [];
  const soccerItems = soccerArticles.map((soccerArticle, index) => {
    const articleDate = new Date(soccerArticle.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${soccerArticle.headline}`}
        icon={
          soccerArticle.images && soccerArticle.images[0]?.url ? { source: soccerArticle.images[0].url } : undefined
        }
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${soccerArticle.links.web.href}`} />
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
      <List.Section title={`${soccerArticles.length} Article${soccerArticles.length !== 1 ? "s" : ""}`}>
        {soccerItems}
      </List.Section>
    </List>
  );
}
