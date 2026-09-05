import { Action, ActionPanel, Icon, Image, Keyboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { shouldShowListWithDetails } from "./common";
import { ToggleDetailsAction, TweetListItem, useModeratableReplyIds } from "./v2/components/tweet";
import { deduplicateById } from "./v2/lib/twitter";
import { clientV2, TwitterUserNotFoundError } from "./v2/lib/twitterapi_v2";

interface Arguments {
  username?: string;
}

function getProfileMarkdown(user: Awaited<ReturnType<typeof clientV2.getUserByUsername>>): string {
  const metrics = user.public_metrics;
  const lines = [`# ${user.name}`, `[@${user.username}](https://x.com/${user.username})`];
  if (user.description) lines.push(user.description);
  if (user.location) lines.push(`Location: ${user.location}`);
  if (user.url) lines.push(user.url);
  if (metrics) {
    lines.push(
      `**${metrics.followers_count ?? 0}** followers · **${metrics.following_count ?? 0}** following · **${metrics.tweet_count ?? 0}** posts`,
    );
  }
  if (user.profile_banner_url) lines.push(`![Profile banner](${user.profile_banner_url})`);
  return lines.join("\n\n");
}

export default function UserProfileCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const [username, setUsername] = useState(props.arguments.username?.trim() ?? props.fallbackText?.trim() ?? "");
  const [isShowingDetail, setIsShowingDetail] = useState(shouldShowListWithDetails);
  const normalizedUsername = username.trim().replace(/^@/, "");
  const hasUsername = username.trim().length > 0;
  const isValidUsername = /^[A-Za-z0-9_]{1,15}$/.test(normalizedUsername);
  const {
    data: user,
    error: userError,
    isLoading: isLoadingUser,
    revalidate: retryUser,
  } = usePromise(async (handle: string) => await clientV2.getUserByUsername(handle), [normalizedUsername], {
    execute: isValidUsername,
  });
  const currentUser =
    isValidUsername && user?.username.toLowerCase() === normalizedUsername.toLowerCase() ? user : undefined;
  const {
    data: posts,
    error: postsError,
    isLoading: isLoadingPosts,
    pagination,
  } = usePromise(
    (userId: string) => async (options: { cursor?: string }) => {
      const page = await clientV2.getTweetsFromAuthor(userId, [], options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [currentUser?.id ?? ""],
    { execute: Boolean(currentUser) },
  );
  const uniquePosts = deduplicateById(posts);
  const moderatableReplyIds = useModeratableReplyIds(uniquePosts);

  useEffect(() => {
    if (postsError) {
      showToast({ style: Toast.Style.Failure, title: "Could not load recent posts", message: postsError.message });
    }
  }, [postsError]);

  const emptyState = !hasUsername
    ? { title: "Find a User Profile", description: "Enter an exact X username or handle.", icon: Icon.Person }
    : !isValidUsername
      ? {
          title: "Invalid Username",
          description: "Use 1 to 15 letters, numbers, or underscores.",
          icon: Icon.ExclamationMark,
        }
      : userError instanceof TwitterUserNotFoundError
        ? { title: "Profile Not Found", description: userError.message, icon: Icon.Person }
        : userError
          ? { title: "Could Not Load Profile", description: userError.message, icon: Icon.ExclamationMark }
          : { title: "Find a User Profile", description: `Looking up @${normalizedUsername}…`, icon: Icon.Person };

  return (
    <List
      isLoading={isLoadingUser || isLoadingPosts}
      searchText={username}
      onSearchTextChange={setUsername}
      searchBarPlaceholder="Enter an X username..."
      filtering={false}
      throttle
      isShowingDetail={isShowingDetail}
      pagination={currentUser ? pagination : undefined}
    >
      {!currentUser && !isLoadingUser && (
        <List.EmptyView
          title={emptyState.title}
          description={emptyState.description}
          icon={emptyState.icon}
          actions={
            isValidUsername && userError ? (
              <ActionPanel>
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={retryUser}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      {currentUser && (
        <List.Section title="Profile">
          <List.Item
            id={`profile-${currentUser.id}`}
            title={currentUser.name}
            subtitle={`@${currentUser.username}`}
            icon={
              currentUser.profile_image_url
                ? { source: currentUser.profile_image_url, mask: Image.Mask.Circle }
                : Icon.Person
            }
            accessories={currentUser.verified ? [{ tag: "Verified" }] : undefined}
            detail={isShowingDetail ? <List.Item.Detail markdown={getProfileMarkdown(currentUser)} /> : undefined}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Profile on X" url={`https://x.com/${currentUser.username}`} />
                <Action.CopyToClipboard title="Copy Username" content={`@${currentUser.username}`} />
                <ToggleDetailsAction isShowingDetail={isShowingDetail} onToggle={setIsShowingDetail} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {currentUser && uniquePosts.length > 0 && (
        <List.Section title="Recent Posts">
          {uniquePosts.map((tweet) => (
            <TweetListItem
              key={tweet.id}
              tweet={tweet}
              canModerateReply={moderatableReplyIds.has(tweet.id)}
              withDetail={isShowingDetail}
              onToggleDetails={setIsShowingDetail}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
