import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { PostForm, PageForm } from "./components";
import {
  useSearch,
  WPPost,
  WPPage,
  getTitle,
  truncateText,
  getStatusIcon,
  formatRelativeDate,
  getEditPostUrl,
  getEditPageUrl,
} from "./utils";

type ContentType = "any" | "post" | "page";

function isPost(item: WPPost | WPPage): item is WPPost {
  return item.type === "post";
}

export default function SearchContent() {
  const [searchText, setSearchText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("any");

  const {
    data: results,
    isLoading,
    revalidate,
  } = useSearch(searchText, contentType === "any" ? undefined : contentType);

  // Group results by type
  const posts = results?.filter(isPost) || [];
  const pages = (results?.filter((item) => !isPost(item)) as WPPage[]) || [];

  const showPosts = contentType === "any" || contentType === "post";
  const showPages = contentType === "any" || contentType === "page";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search posts and pages..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={contentType}
          onChange={(value) => setContentType(value as ContentType)}
        >
          <List.Dropdown.Item title="All Content" value="any" />
          <List.Dropdown.Item title="Posts Only" value="post" />
          <List.Dropdown.Item title="Pages Only" value="page" />
        </List.Dropdown>
      }
    >
      {!searchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your WordPress content"
          description="Type to search across posts and pages"
        />
      )}

      {searchText && results?.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description="Try a different search term"
        />
      )}

      {showPosts && posts.length > 0 && (
        <List.Section title="Posts" subtitle={`${posts.length} results`}>
          {posts.map((post) => {
            const statusIcon = getStatusIcon(post.status);

            return (
              <List.Item
                key={`post-${post.id}`}
                title={getTitle(post)}
                subtitle={truncateText(post.excerpt.rendered, 50)}
                icon={Icon.Document}
                accessories={[{ text: formatRelativeDate(post.date) }, { icon: statusIcon }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="View Post"
                      url={post.link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.Push
                      title="Edit Post"
                      icon={Icon.Pencil}
                      target={<PostForm post={post} onSuccess={() => revalidate()} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action.OpenInBrowser
                      title="Edit in Wordpress"
                      url={getEditPostUrl(post.id)}
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={post.link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {showPages && pages.length > 0 && (
        <List.Section title="Pages" subtitle={`${pages.length} results`}>
          {pages.map((page) => {
            const statusIcon = getStatusIcon(page.status);

            return (
              <List.Item
                key={`page-${page.id}`}
                title={getTitle(page)}
                subtitle={truncateText(page.excerpt.rendered, 50)}
                icon={Icon.Book}
                accessories={[{ text: formatRelativeDate(page.date) }, { icon: statusIcon }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="View Page"
                      url={page.link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.Push
                      title="Edit Page"
                      icon={Icon.Pencil}
                      target={<PageForm page={page} onSuccess={() => revalidate()} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action.OpenInBrowser
                      title="Edit in Wordpress"
                      url={getEditPageUrl(page.id)}
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={page.link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
