import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { fetchAllPosts } from "../lib/buffer";
import { Post } from "../lib/types";
import { channelIcon, firstImageThumbnail, formatDate, serviceLabel, truncate } from "../lib/format";
import { PostDetail } from "./post-detail";
import { PostActions } from "./post-actions";

type DateField = "dueAt" | "sentAt" | "createdAt";

export function PostList({
  filter,
  dateField,
  emptyTitle,
  showMetrics = false,
}: {
  filter: (post: Post) => boolean;
  dateField: DateField;
  emptyTitle: string;
  showMetrics?: boolean;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(fetchAllPosts, [], {
    onError(error) {
      showFailureToast(error, { title: "Could not load posts" });
    },
  });

  const posts = sortPosts((data ?? []).filter(filter), dateField);

  return (
    <List isLoading={isLoading} isShowingDetail={false}>
      <List.EmptyView title={emptyTitle} icon={Icon.Tray} />
      {posts.map((post) => (
        <PostListItem key={post.id} post={post} dateField={dateField} showMetrics={showMetrics} onMutate={revalidate} />
      ))}
    </List>
  );
}

function PostListItem({
  post,
  dateField,
  showMetrics,
  onMutate,
}: {
  post: Post;
  dateField: DateField;
  showMetrics: boolean;
  onMutate: () => void;
}) {
  const thumbnail = firstImageThumbnail(post);
  const accessories: List.Item.Accessory[] = [];

  if (showMetrics && post.metrics && post.metrics.length > 0) {
    const primary = post.metrics
      .slice(0, 2)
      .map((m) => `${m.name}: ${Math.round(m.value)}`)
      .join("  ·  ");
    accessories.push({ text: primary });
  }

  accessories.push({ text: formatDate(post[dateField]) });
  // When the post has media, show it as the leading icon and keep the network
  // recognizable via a trailing channel accessory.
  const leadingIcon: Image.ImageLike = thumbnail
    ? { source: thumbnail, mask: Image.Mask.RoundedRectangle }
    : channelIcon(post);
  if (thumbnail) {
    accessories.push({
      icon: channelIcon(post),
      tooltip: serviceLabel(post.channelService),
    });
  }

  return (
    <List.Item
      icon={leadingIcon}
      title={truncate(post.text || "(no text)")}
      subtitle={serviceLabel(post.channelService)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <PostActions
            post={post}
            onMutate={onMutate}
            detailAction={
              <Action.Push
                title="Show Details"
                icon={Icon.Eye}
                target={<PostDetail post={post} onMutate={onMutate} />}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}

function sortPosts(posts: Post[], dateField: DateField): Post[] {
  const ascending = dateField === "dueAt"; // upcoming first for scheduled
  return [...posts].sort((a, b) => {
    const av = a[dateField] ? new Date(a[dateField] as string).getTime() : 0;
    const bv = b[dateField] ? new Date(b[dateField] as string).getTime() : 0;
    return ascending ? av - bv : bv - av;
  });
}
