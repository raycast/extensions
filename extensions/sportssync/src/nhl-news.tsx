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
  // Fetch NHL Articles

  const { isLoading: nhlArticlesStatus, data: nhlArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news",
  );

  const nhlArticles = nhlArticlesData?.articles || [];
  const nhlItems = nhlArticles?.map((nhlArticle, index) => {
    const articleDate = new Date(nhlArticle?.published ?? "Unknown").toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";
    let articleType = nhlArticle?.type;

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    return (
      <List.Item
        key={index}
        title={`${nhlArticle?.headline ?? "No Headline Found"}`}
        icon={{ source: nhlArticle?.images[0]?.url }}
        accessories={[
          { tag: { value: articleType ?? "Unknown", color: Color.Green }, icon: Icon.Megaphone },
          { text: { value: `${accessoryTitle ?? "No Date Found"}` }, tooltip: accessoryToolTip ?? "Unknown" },
          { icon: Icon.Calendar },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Article on ESPN"
              url={`${nhlArticle?.links?.web?.href ?? "https://www.espn.com"}`}
            />
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
      <List.Section title={`${nhlArticles?.length} Article${nhlArticles?.length !== 1 ? "s" : ""}`}>
        {nhlItems}
      </List.Section>
    </List>
  );
}
