import { ActionPanel, List } from "@raycast/api";
import { ArticleAction } from "./components/article-action";
import { getArticles } from "./hooks/hooks";

export default function SearchArticle() {
  const { data, isLoading, pagination, revalidate } = getArticles();
  const articles = data.filter((article) => article.published);
  const drafts = data.filter((article) => !article.published);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search your articles from dev.to"
      pagination={pagination}
    >
      <List.EmptyView title={""} description={"No article found"} />

      <List.Section title="Latest">
        {articles.map((article, todoIndex) => (
          <List.Item
            key={"article" + todoIndex}
            title={{ value: article.title, tooltip: article.title }}
            detail={
              <List.Item.Detail
                markdown={article.body_markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {article.tag_list.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ArticleAction article={article} onRevalidate={revalidate} />
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
            detail={
              <List.Item.Detail
                markdown={draft.body_markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {draft.tag_list.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ArticleAction article={draft} onRevalidate={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
