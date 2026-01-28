import { format } from "date-fns";
import { useMemo } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { Post, WithDetails } from "@/types";

export type PostItemProps = WithDetails & {
  post: Post;
};

export default function PostItem({ post, toggleDetails, detailsShown }: PostItemProps) {
  const pubDate = format(new Date(post.post_date), "MMM dd, yyyy");
  const pubDateTime = format(new Date(post.post_date), "yyyy-MM-dd HH:mm:ss");
  const hearts = post.reactions ? post.reactions["❤"] : 0;

  const author = post.publishedBylines?.length > 0 ? post.publishedBylines[0] : null;

  const accessories = useMemo(() => {
    if (detailsShown) return [];
    const acc = [
      {
        tag: pubDate,
        icon: Icon.Calendar,
        tooltip: `Published on ${pubDateTime}`,
      },
    ];

    if (hearts > 0) {
      acc.unshift({
        tag: hearts.toString(),
        icon: Icon.Heart,
        tooltip: `Hearts: ${hearts}`,
      });
    }

    return acc;
  }, [pubDate, pubDateTime, hearts, post.comments_count, detailsShown]);

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

${post.truncated_body_text}`}
          metadata={
            <List.Item.Detail.Metadata>
              {author && author.name && author.handle ? (
                <List.Item.Detail.Metadata.Link
                  title="Author"
                  text={`${author.name}`}
                  target={`https://substack.com/@${author.handle}`}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label title="Published" text={pubDateTime} />
              {post.canonical_url ? (
                <List.Item.Detail.Metadata.Link target={post.canonical_url} title="Read More" text="Open on Substack" />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={detailsShown ? "Hide Details" : "Show Details"}
            onAction={toggleDetails}
            icon={{ source: Icon.AppWindowSidebarLeft, tintColor: "#FF6719" }}
          />
          {post.canonical_url && (
            <Action.OpenInBrowser title="Open on Substack" url={post.canonical_url} icon={{ source: "substack.svg" }} />
          )}
          {author && author.name && author.handle ? (
            <Action.OpenInBrowser
              title="Open Author Page on Substack"
              url={`https://substack.com/@${author.handle}`}
              icon={{ source: "substack.svg" }}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
