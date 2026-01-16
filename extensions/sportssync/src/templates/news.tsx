import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import ArticleDetail from "../views/articleDetail";
import getArticles from "../utils/getArticles";
import sportInfo from "../utils/getSportInfo";

interface DayItems {
  title: string;
  articles: JSX.Element[];
}

export default function DisplayNews() {
  const { articleData, articleLoading, articleRevalidate } = getArticles();
  const currentLeague = sportInfo.getLeague();

  const articleDayItems: DayItems[] = [];
  const articles = articleData?.articles || [];

  articles?.forEach((article, index) => {
    const articleDate = new Date(article?.published ?? "Unknown").toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const articleHeadline = article?.headline ?? "No Headline Found";
    let articleType = article?.type ?? "Unknown";

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    let dayItem = articleDayItems?.find((item) => item?.title === articleDate);

    if (!dayItem) {
      dayItem = { title: articleDate, articles: [] };
      articleDayItems.push(dayItem);
    }

    dayItem.articles.push(
      <List.Item
        key={index}
        title={`${articleHeadline}`}
        icon={{
          source:
            article?.images?.[0]?.url ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
        }}
        accessories={[
          { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone, tooltip: "Category" },
          { icon: Icon.Megaphone },
        ]}
        actions={
          <ActionPanel>
            <Action.Push title="View Article" icon={Icon.Book} target={<ArticleDetail articleId={article.id} />} />
            <Action.OpenInBrowser
              title="Read Article on ESPN"
              url={`${article?.links?.web?.href ?? `https://www.espn.com/${currentLeague}`}`}
            />
            <Action.CopyToClipboard
              title="Copy Article Link"
              content={`${article?.links?.web?.href ?? `https://www.espn.com/${currentLeague}`}`}
            ></Action.CopyToClipboard>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={articleRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            ></Action>
          </ActionPanel>
        }
      />,
    );
  });

  if (articleLoading) {
    return <Detail isLoading={true} />;
  }

  if (!articleData || articleDayItems.length === 0) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      {articleDayItems.map((dayItem, index) => (
        <List.Section
          key={index}
          title={`${dayItem?.title ?? "Articles"}`}
          subtitle={`${dayItem.articles?.length ?? "0"} Article${dayItem.articles?.length !== 1 ? "s" : ""}`}
        >
          {dayItem?.articles}
        </List.Section>
      ))}
    </>
  );
}
