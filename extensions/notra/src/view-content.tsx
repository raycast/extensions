import { ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { ContentTypeDropdown } from "./components/content-type-dropdown";
import { PostListItem } from "./components/post-list-item";
import { WorkspaceSubmenu } from "./components/workspace-switcher";
import { usePosts } from "./hooks/use-posts";
import { useWorkspace } from "./hooks/use-workspace";
import type { ContentTypeFilter } from "./types";

export default function Command() {
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const { isLoading: isLoadingWorkspace, switchWorkspace, workspace, workspaces } = useWorkspace();
  const {
    data: posts,
    isLoading,
    pagination,
    revalidate,
  } = usePosts(contentType, {
    execute: !isLoadingWorkspace,
    organizationId: workspace?.id,
  });
  const workspaceSubmenu = (
    <WorkspaceSubmenu onChange={switchWorkspace} workspace={workspace} workspaces={workspaces} />
  );

  return (
    <List
      isLoading={isLoadingWorkspace || isLoading}
      navigationTitle={workspaces.length > 1 && workspace ? `Content · ${workspace.name}` : undefined}
      pagination={pagination}
      searchBarAccessory={<ContentTypeDropdown onChange={setContentType} />}
      searchBarPlaceholder="Search posts..."
    >
      <List.EmptyView
        actions={<ActionPanel>{workspaceSubmenu}</ActionPanel>}
        description="Try changing the content type filter."
        title="No Posts Found"
      />
      {posts?.map((post) => (
        <PostListItem
          extraActions={workspaceSubmenu}
          key={post.id}
          onPostMutated={revalidate}
          organizationSlug={workspace?.slug}
          post={post}
        />
      ))}
    </List>
  );
}
