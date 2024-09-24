import { ActionPanel, List } from "@raycast/api";
import { ArticleAction } from "./components/article-action";
import { getArticles } from "./hooks/hooks";

export default function SearchArticle() {
  const { data, isLoading, pagination } = getArticles("/articles/me/all");
  const articles = data.filter(article => article.published);
  const drafts = data.filter(article => !article.published);
  
  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search your articles from dev.to" pagination={pagination}>
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
