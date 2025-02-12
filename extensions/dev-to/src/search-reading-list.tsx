import { ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ReadingListItemAction } from "./components/reading-list-action";
import { getArticleMarkdown, getReadingList } from "./hooks/hooks";

export default function SearchReadingList() {
  const [articleId, setArticleId] = useState(0);
  const { data: readingList, isLoading, pagination } = getReadingList();
  const { data: bodyMarkdown, isLoading: detailLoading } = getArticleMarkdown(articleId);

  return (
    <List
      isShowingDetail
      isLoading={isLoading || detailLoading}
      onSelectionChange={(id) => setArticleId(Number(id))}
      searchBarPlaceholder="Search your reading list from dev.to"
      pagination={pagination}
    >
      <List.EmptyView title={""} description={"No article found"} />

      {readingList.map((item, todoIndex) => {
        const {
          id,
          title,
          tags,
          comments_count,
          public_reactions_count,
          reading_time_minutes,
          created_at,
          cover_image,
          user,
        } = item.article;
        const { name } = user;

        const createdAt = new Date(created_at);
        const formattedCreatedAt = createdAt.toDateString();

        return (
          <List.Item
            id={String(id)}
            key={"article" + todoIndex}
            title={{ value: title, tooltip: title }}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${cover_image})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Article" />
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {tags.split(",").map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Comments"
                      text={String(comments_count)}
                      icon={Icon.Message}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Reactions"
                      text={String(public_reactions_count)}
                      icon={Icon.Gauge}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Estimate"
                      text={String(reading_time_minutes)}
                      icon={Icon.Alarm}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Created at"
                      text={String(formattedCreatedAt)}
                      icon={Icon.List}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Author" />
                    <List.Item.Detail.Metadata.Label title="Name" text={name} icon={Icon.Person} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ReadingListItemAction article={item.article} bodyMarkdown={bodyMarkdown} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
