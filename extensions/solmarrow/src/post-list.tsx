import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { api, APP_URL, type Post } from "./api";
import { firstLine, postErrors, soonestFirst } from "./format";
import { useWorkspace } from "./hooks";

export function PostList({ kind }: { kind: "upcoming" | "failed" }) {
  const { workspaces, workspaceId, setWorkspaceId, isLoading: loadingWorkspaces } = useWorkspace();
  const {
    data = [],
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string, k: string) => {
      if (!id) return [];
      if (k === "failed") return api().posts(id, { status: "failed", limit: 50 });
      return soonestFirst(await api().posts(id, { status: "scheduled", from: new Date().toISOString(), limit: 50 }));
    },
    [workspaceId, kind],
    {
      onError: (e) => {
        void showFailureToast(e, { title: "Couldn't load your posts" });
      },
    },
  );

  async function remove(post: Post) {
    const ok = await confirmAlert({
      title: "Delete Post?",
      message: "It won't be published. This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await api().deletePost(post.id);
      await showToast({ style: Toast.Style.Success, title: "Post deleted" });
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't delete the post" });
    }
  }

  return (
    <List
      isLoading={loadingWorkspaces || isLoading}
      isShowingDetail={data.length > 0}
      searchBarPlaceholder="Filter posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {workspaces.map((w) => (
            <List.Dropdown.Item key={w.id} value={w.id} title={w.name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={kind === "failed" ? Icon.CheckCircle : Icon.Calendar}
        title={kind === "failed" ? "No Failed Posts" : "No Upcoming Posts"}
        description={kind === "failed" ? "Everything went out." : "Use Create Post to schedule one."}
      />
      {data.map((post) => {
        const errors = postErrors(post);
        const networks = [...new Set((post.accounts ?? []).map((a) => a.network))];
        return (
          <List.Item
            key={post.id}
            title={firstLine(post.text)}
            subtitle={kind === "upcoming" ? (post.scheduled_local ?? undefined) : undefined}
            keywords={networks}
            icon={kind === "failed" ? { source: Icon.ExclamationMark } : Icon.Clock}
            detail={
              <List.Item.Detail
                markdown={[
                  post.text ?? "",
                  errors.length ? `\n---\n**Errors**\n\n${errors.map((e) => `- ${e}`).join("\n")}` : "",
                ].join("")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text={post.status} />
                    {post.scheduled_local ? (
                      <List.Item.Detail.Metadata.Label title="Scheduled" text={post.scheduled_local} />
                    ) : null}
                    <List.Item.Detail.Metadata.TagList title="Accounts">
                      {(post.accounts ?? []).map((a) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={a.account_id}
                          text={`${a.network}: ${a.name ?? ""}`.trim()}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open SolMarrow Calendar" url={`${APP_URL}/calendar`} />
                <Action.CopyToClipboard title="Copy Text" content={post.text ?? ""} />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action
                  title="Delete Post"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(post)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
