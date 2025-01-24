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
  // Fetch F! Articles

  const { isLoading: f1ArticlesStatus, data: f1ArticlesData } = useFetch<ArticlesResponse>(
    "https://site.api.espn.com/apis/site/v2/sports/racing/f1/news",
  );

  const f1Articles = f1ArticlesData?.articles || [];
  const f1Items = f1Articles.map((f1Article, index) => {
    const articleDate = new Date(f1Article.published).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const accessoryTitle = articleDate;
    const accessoryToolTip = "Date Published";

    return (
      <List.Item
        key={index}
        title={`${f1Article.headline}`}
        icon={{ source: f1Article.images[0].url }}
        accessories={[{ text: { value: `${accessoryTitle}` }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Article on ESPN" url={`${f1Article.links.web.href}`} />
          </ActionPanel>
        }
      />
    );
  });

  if (f1ArticlesStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <List searchBarPlaceholder="Search for an article" isLoading={f1ArticlesStatus}>
      <List.Section title={`${f1Articles.length} Article${f1Articles.length !== 1 ? "s" : ""}`}>{f1Items}</List.Section>
    </List>
  );
}
