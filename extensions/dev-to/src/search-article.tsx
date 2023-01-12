import { ActionPanel, List } from "@raycast/api";
import { ArticleAction } from "./components/article-action";
import { getArticles } from "./hooks/hooks";
import useStore from "./utils/state";

export default function SearchArticle() {
  const { refresh } = useStore();

  const { articles, loading } = getArticles(refresh, "/articles/me/published");
  const { articles: drafts, loading: draftsLoading } = getArticles(refresh, "/articles/me/unpublished");
  console.log("articles", articles);

  return (
    <List isShowingDetail isLoading={loading || draftsLoading} searchBarPlaceholder="Search your articles from dev.to">
      <List.EmptyView title={""} description={"No article found"} />

      <List.Section title="Latest">
        {articles.map((article, todoIndex) => (
          <List.Item
            key={"article" + todoIndex}
            title={{ value: article.title, tooltip: article.title }}
            accessories={[{ text: article.tag_list.length === 0 ? "" : article.tag_list[0] }]}
            detail={<List.Item.Detail markdown={article.body_markdown} />}
            actions={
              <ActionPanel>
                <ArticleAction article={article} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Drafts">
        {drafts.map((draft, todoIndex) => (
          <List.Item
            key={"draft" + todoIndex}
            title={{ value: draft.title, tooltip: draft.title }}
            accessories={[{ text: draft.tag_list.length === 0 ? "" : draft.tag_list[0] }]}
            detail={<List.Item.Detail markdown={draft.body_markdown} />}
            actions={
              <ActionPanel>
                <ArticleAction article={draft} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
