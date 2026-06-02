import { getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useCallback } from "react";
import { ListCategoryDropdown } from "./category-dropdown";
import { getEmptyViewProps } from "./empty-view-props";
import { PostActionPanel } from "./post-action-panel";
import { PostDetailMetadata } from "./post-detail-metadata";
import { getPostMeta } from "./post-meta";
import type { Post } from "./types";
import type { usePostsFeed } from "./use-posts-feed";
import { useReadPosts } from "./use-read-posts";

type Feed = ReturnType<typeof usePostsFeed>;

export function PostsListView(feed: Feed) {
  const { postsPerPage } = getPreferenceValues<Preferences>();
  const { isRead, markRead, markUnread } = useReadPosts();
  const {
    categoryId,
    setCategoryId,
    searchText,
    authorFilter,
    setAuthorFilter,
    allPosts,
    hasMore,
    isLoading,
    error,
    setPage,
    refresh,
    onSearchTextChange,
    useGroups,
    groups,
  } = feed;

  const handleSelectionChange = useCallback(
    (id: string | null) => {
      if (!id) return;
      const postId = Number(id);
      if (!Number.isNaN(postId)) void markRead(postId);
    },
    [markRead],
  );

  function renderPost(post: Post) {
    const { title, thumbnail, author, dateStr, primaryCat, detailMarkdown } =
      getPostMeta(post);
    const read = isRead(post.id);

    return (
      <List.Item
        key={post.id}
        id={String(post.id)}
        icon={
          thumbnail
            ? { source: thumbnail, mask: Image.Mask.RoundedRectangle }
            : Icon.Document
        }
        title={title}
        detail={
          <List.Item.Detail
            markdown={detailMarkdown}
            metadata={
              <PostDetailMetadata
                author={author}
                primaryCat={primaryCat}
                dateStr={dateStr}
                link={post.link}
              />
            }
          />
        }
        actions={
          <PostActionPanel
            post={post}
            read={read}
            primaryCat={primaryCat}
            categoryId={categoryId}
            authorFilter={authorFilter}
            markRead={markRead}
            markUnread={markUnread}
            setCategoryId={setCategoryId}
            setAuthorFilter={setAuthorFilter}
            refresh={refresh}
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={{
        pageSize: Number(postsPerPage),
        hasMore,
        onLoadMore: () => setPage((p) => p + 1),
      }}
      onSearchTextChange={onSearchTextChange}
      onSelectionChange={handleSelectionChange}
      searchBarPlaceholder="Szukaj wpisów…"
      searchBarAccessory={
        <ListCategoryDropdown
          categoryId={categoryId}
          onChange={setCategoryId}
        />
      }
      throttle
    >
      {allPosts.length === 0 && !isLoading ? (
        <List.EmptyView
          {...getEmptyViewProps(error, authorFilter, searchText, categoryId)}
        />
      ) : useGroups ? (
        groups.map((group) => (
          <List.Section key={group.title} title={group.title}>
            {group.posts.map(renderPost)}
          </List.Section>
        ))
      ) : (
        allPosts.map(renderPost)
      )}
    </List>
  );
}
