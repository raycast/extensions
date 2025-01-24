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
  // Fetch NHL Articles

  const { isLoading: nhlArticlesStatus, data: nhlArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news",
  );

  const nhlArticles = nhlArticlesData?.articles || [];
  const nhlItems = nhlArticles.map((nhlArticle, index) => {
    const articleDate = new Date(nhlArticle.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${nhlArticle.headline}`}
        icon={{ source: nhlArticle.images[0].url }}
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${nhlArticle.links.web.href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (nhlArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List searchBarPlaceholder="Search for an article" isLoading={nhlArticlesStatus}>
      <List.Section title={`${nhlArticles.length} Article${nhlArticles.length !== 1 ? "s" : ""}`}>
        {nhlItems}
      </List.Section>
    </List>
  );
}
