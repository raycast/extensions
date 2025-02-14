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
  // Fetch MLB Articles

  const { isLoading: mlbArticlesStatus, data: mlbArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news",
  );

  const mlbArticles = mlbArticlesData?.articles || [];
  const mlbItems = mlbArticles.map((mlbArticle, index) => {
    const articleDate = new Date(mlbArticle.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${mlbArticle.headline}`}
        icon={{ source: mlbArticle.images[0].url }}
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${mlbArticle.links.web.href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (mlbArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List searchBarPlaceholder="Search for an article" isLoading={mlbArticlesStatus}>
      <List.Section title={`${mlbArticles.length} Article${mlbArticles.length !== 1 ? "s" : ""}`}>
        {mlbItems}
      </List.Section>
    </List>
  );
}
