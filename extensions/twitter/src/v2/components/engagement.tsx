import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { clientV2, Fetcher, PostEngagementKind } from "../lib/twitterapi_v2";
import { TweetList } from "./tweet";
import { deduplicateById } from "../lib/twitter";

function EngagementUsers({ postId, kind }: { postId: string; kind: "likes" | "reposts" }) {
  const { data, error, isLoading, pagination, revalidate } = usePromise(() => async (options: { cursor?: string }) => {
    const page = await clientV2.postEngagementUsers(postId, kind, options.cursor);
    return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
  });

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder={`Filter ${kind}...`}>
      <List.EmptyView
        title={
          error
            ? `Could Not Load ${kind === "likes" ? "Likes" : "Reposts"}`
            : `No ${kind === "likes" ? "Likes" : "Reposts"} Found`
        }
        description={error?.message}
        icon={error ? Icon.ExclamationMark : undefined}
        actions={
          error ? (
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {deduplicateById(data).map((user) => (
        <List.Item
          key={user.id}
          title={user.name}
          subtitle={`@${user.username}`}
          icon={user.profile_image_url ? { source: user.profile_image_url, mask: Image.Mask.Circle } : Icon.Person}
          accessories={user.verified ? [{ icon: Icon.CheckCircle, tooltip: "Verified" }] : undefined}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Profile on X" url={`https://x.com/${user.username}`} />
              <Action.CopyToClipboard title="Copy Username" content={`@${user.username}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function QuotedPosts({ postId }: { postId: string }) {
  const { data, error, isLoading, pagination, revalidate } = usePromise(() => async (options: { cursor?: string }) => {
    const page = await clientV2.quotedPosts(postId, options.cursor);
    return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
  });
  const refresh = async () => {
    await revalidate();
  };
  const fetcher: Fetcher = { updateInline: refresh, refresh };

  return (
    <TweetList
      tweets={data}
      error={error}
      isLoading={isLoading}
      fetcher={fetcher}
      pagination={pagination}
      searchBarPlaceholder="Filter quote posts..."
      errorViewTitle="Could Not Load Quote Posts"
      emptyViewTitle="No Quote Posts Found"
    />
  );
}

export function PostEngagementList({ postId, kind }: { postId: string; kind: PostEngagementKind }) {
  return kind === "quotes" ? <QuotedPosts postId={postId} /> : <EngagementUsers postId={postId} kind={kind} />;
}
