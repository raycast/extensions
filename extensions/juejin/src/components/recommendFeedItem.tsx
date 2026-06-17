import { Color, List } from "@raycast/api";
import { RecommendFeedAction } from "./recommendFeedAction";
import { getIcon } from "./recommendFeedIcon";

export function RecommendFeedItem({
  index,
  articleId,
  title,
  readTime,
  viewCount,
  commentCount,
}: {
  index: number;
  articleId: string;
  title: string;
  readTime: string;
  viewCount: string;
  commentCount: string;
}) {
  return (
    <List.Item
      icon={getIcon(index)}
      title={title}
      subtitle={readTime}
      accessories={[
        {
          text: {
            value: `👀 ${viewCount}`,
            color: Color.SecondaryText,
          },
        },
        {
          text: {
            value: `💬 ${commentCount}`,
            color: Color.SecondaryText,
          },
        },
      ]}
      actions={<RecommendFeedAction articleId={articleId} />}
    />
  );
}
