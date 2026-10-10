import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  cancelScheduledPost,
  getProfiles,
  getAllScheduledPosts,
  parseApiDate,
  platformName,
  ScheduledPost,
  urls,
} from "./api";
import { UploadStatus } from "./components/upload-status";

const TYPE_ICONS: Record<string, Icon> = { video: Icon.Video, photo: Icon.Image, text: Icon.Text };

export default function Command() {
  const [profile, setProfile] = useState<string>("");
  const { data: profilesData } = useCachedPromise(getProfiles, []);
  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    (profileUsername: string) => getAllScheduledPosts({ profile: profileUsername || undefined }),
    [profile],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load scheduled posts" });
      },
    },
  );

  const posts = [...(data?.scheduled_posts ?? [])].sort(
    (a, b) => (parseApiDate(a.scheduled_date)?.getTime() ?? 0) - (parseApiDate(b.scheduled_date)?.getTime() ?? 0),
  );

  async function cancel(post: ScheduledPost) {
    const confirmed = await confirmAlert({
      title: "Cancel Scheduled Post?",
      message: `"${postTitle(post)}" will not be published on ${formatPlatforms(post)} on ${formatDate(
        post.scheduled_date,
      )}. This can't be undone.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Cancel Post", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep It" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling post…" });
    try {
      const result = await mutate(cancelScheduledPost(post.job_id), {
        optimisticUpdate: (current) =>
          current && {
            ...current,
            scheduled_posts: current.scheduled_posts.filter((p) => p.job_id !== post.job_id),
            total: Math.max(0, (current.total ?? 1) - 1),
          },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Post cancelled";
      if (result?.credits_refunded) toast.message = `${result.credits_refunded} upload credit(s) refunded`;
    } catch (error) {
      await showFailureToast(error, { title: "Could not cancel the post" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={posts.length > 0}
      searchBarPlaceholder="Search scheduled posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Profile" onChange={setProfile} storeValue>
          <List.Dropdown.Item title="All Profiles" value="" />
          {(profilesData?.profiles ?? []).map((p) => (
            <List.Dropdown.Item key={p.username} title={p.username} value={p.username} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Calendar}
        title="No Scheduled Posts"
        description="Posts you schedule or add to the queue show up here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Calendar" url={urls.calendar} />
          </ActionPanel>
        }
      />
      {posts.map((post) => (
        <List.Item
          key={post.job_id}
          icon={TYPE_ICONS[post.post_type ?? ""] ?? Icon.Document}
          title={postTitle(post)}
          keywords={[...(post.platforms ?? []), post.profile_username ?? "", post.external_id ?? ""]}
          accessories={[{ date: parseApiDate(post.scheduled_date), tooltip: formatDate(post.scheduled_date) }]}
          detail={
            <List.Item.Detail
              markdown={post.thumbnail_url ? `![Thumbnail](${post.thumbnail_url}?raycast-height=180)` : undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Publishes" text={formatDate(post.scheduled_date)} />
                  <List.Item.Detail.Metadata.Label title="Profile" text={post.profile_username ?? "-"} />
                  <List.Item.Detail.Metadata.TagList title="Platforms">
                    {(post.platforms ?? []).map((p) => (
                      <List.Item.Detail.Metadata.TagList.Item key={p} text={platformName(p)} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Type" text={post.post_type ?? "-"} />
                  {post.source_filename && <List.Item.Detail.Metadata.Label title="File" text={post.source_filename} />}
                  {post.external_id && <List.Item.Detail.Metadata.Label title="External ID" text={post.external_id} />}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Title" text={post.title || "-"} />
                  {post.caption && <List.Item.Detail.Metadata.Label title="Caption" text={post.caption} />}
                  <List.Item.Detail.Metadata.Label title="Job ID" text={post.job_id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Show Status" icon={Icon.Info} target={<UploadStatus jobId={post.job_id} />} />
              <Action
                title="Cancel Post"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => cancel(post)}
              />
              <Action.CopyToClipboard
                title="Copy Job ID"
                content={post.job_id}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.OpenInBrowser title="Open in Upload-Post" url={urls.scheduledPosts} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function postTitle(post: ScheduledPost): string {
  return post.title?.trim() || post.source_filename || "Untitled post";
}

function formatPlatforms(post: ScheduledPost): string {
  return (post.platforms ?? []).map(platformName).join(", ") || "its platforms";
}

function formatDate(iso: string): string {
  return parseApiDate(iso)?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) ?? iso;
}
