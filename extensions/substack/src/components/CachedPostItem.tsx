import { format } from "date-fns";
import { useMemo } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { CachedPost, WithDetails } from "@/types";

export type PostItemProps = WithDetails & {
  post: CachedPost;
};

export default function PostItem({ post, toggleDetails, detailsShown }: PostItemProps) {
  const pubDate = format(new Date(post.post_date), "MMM dd, yyyy");
  const pubDateTime = format(new Date(post.post_date), "yyyy-MM-dd HH:mm:ss");

  const accessories = useMemo(() => {
    if (detailsShown) return [];
    const acc = [
      {
        tag: pubDate,
        icon: Icon.Calendar,
        tooltip: `Published on ${pubDateTime}`,
      },
    ];

    return acc;
  }, [pubDate, pubDateTime, detailsShown]);

  return (
    <List.Item
      id={post._id}
      title={post.title}
      subtitle={!detailsShown ? post.subtitle : undefined}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={`## ${post.title}
> ${post.subtitle}

${post.cover_image ? `<img src="${post.cover_image}" height="100" alt="cover image" />` : ""}

${post.truncated_body}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Published" text={pubDateTime} />
              {post.url ? (
                <List.Item.Detail.Metadata.Link target={post.url} title="Read More" text="Open on Substack" />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title={detailsShown ? "Hide Details" : "Show Details"} onAction={toggleDetails} />
          {post.url && (
            <Action.OpenInBrowser title="Open on Substack" url={post.url} icon={{ source: "substack.svg" }} />
          )}
        </ActionPanel>
      }
    />
  );
}
