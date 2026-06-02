import { getPreferenceValues, Grid } from "@raycast/api";
import { useCallback } from "react";
import { GridCategoryDropdown } from "./category-dropdown";
import { getEmptyViewProps } from "./empty-view-props";
import { PostActionPanel } from "./post-action-panel";
import { getPostMeta, postCover } from "./post-meta";
import type { Post } from "./types";
import type { usePostsFeed } from "./use-posts-feed";
import { useReadPosts } from "./use-read-posts";

type Feed = ReturnType<typeof usePostsFeed>;

export function PostsGridView(feed: Feed) {
  const { gridColumns, postsPerPage } = getPreferenceValues<Preferences>();
  const columns = Number(gridColumns) === 2 ? 2 : 3;
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
    const { title, thumbnail, author, dateStr, primaryCat } = getPostMeta(post);
    const read = isRead(post.id);

    return (
      <Grid.Item
        key={post.id}
        id={String(post.id)}
        content={postCover(thumbnail)}
        title={title}
        subtitle={author?.name ? `${dateStr} · ${author.name}` : dateStr}
        keywords={[title, author?.name ?? "", dateStr]}
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

  const emptyProps = getEmptyViewProps(
    error,
    authorFilter,
    searchText,
    categoryId,
  );

  return (
    <Grid
      columns={columns}
      fit={Grid.Fit.Fill}
      aspectRatio="16/9"
      isLoading={isLoading}
      pagination={{
        pageSize: Number(postsPerPage),
        hasMore,
        onLoadMore: () => setPage((p) => p + 1),
      }}
      onSearchTextChange={onSearchTextChange}
      onSelectionChange={handleSelectionChange}
      searchBarPlaceholder="Szukaj wpisów…"
      searchBarAccessory={
        <GridCategoryDropdown
          categoryId={categoryId}
          onChange={setCategoryId}
        />
      }
      throttle
    >
      {allPosts.length === 0 && !isLoading ? (
        <Grid.EmptyView {...emptyProps} />
      ) : useGroups ? (
        groups.map((group) => (
          <Grid.Section key={group.title} title={group.title}>
            {group.posts.map(renderPost)}
          </Grid.Section>
        ))
      ) : (
        allPosts.map(renderPost)
      )}
    </Grid>
  );
}
