import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { deletePost, publishPost, retryPost, unschedulePost } from "../lib/api";
import { APP_URL, firstLine, platformLabel, Post, postEditUrl, repostUrl } from "../lib/core";
import { destinationLook, formatDateTime, formatTime, platformIcon, postStatusLook, postTime } from "../lib/ui";

interface Props {
  post: Post;
  /** Channel names by id, for the detail pane. */
  channelNames?: Map<number, string>;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onChange: () => void;
  /** Show the time of day only (the queue is already grouped by day). */
  timeOnly?: boolean;
}

export function PostListItem({ post, channelNames, showingDetail, onToggleDetail, onChange, timeOnly }: Props) {
  const look = postStatusLook(post);
  const time = postTime(post);
  const platforms = [...new Set(post.destinations.map((d) => d.platform))];
  const title = firstLine(post.content) || (post.media.length ? "(Media only)" : "(No text)");

  const accessories: List.Item.Accessory[] = showingDetail
    ? [{ icon: { source: look.icon, tintColor: look.color }, tooltip: look.label }]
    : [
        ...platforms.slice(0, 4).map((p) => ({ icon: platformIcon(p), tooltip: platformLabel(p) })),
        ...(platforms.length > 4 ? [{ text: `+${platforms.length - 4}` }] : []),
        ...(post.media.length ? [{ icon: Icon.Image, tooltip: `${post.media.length} media file(s)` }] : []),
        { tag: { value: look.label, color: look.color } },
        ...(time
          ? [
              timeOnly
                ? { text: formatTime(time.date.toISOString()), tooltip: time.tooltip }
                : { date: time.date, tooltip: time.tooltip },
            ]
          : []),
      ];

  return (
    <List.Item
      id={String(post.id)}
      title={title}
      keywords={[post.content, ...platforms.map(platformLabel)]}
      icon={{ source: look.icon, tintColor: look.color }}
      accessories={accessories}
      detail={<PostDetail post={post} channelNames={channelNames} />}
      actions={<PostActions post={post} onToggleDetail={onToggleDetail} onChange={onChange} />}
    />
  );
}

function PostDetail({ post, channelNames }: { post: Post; channelNames?: Map<number, string> }) {
  const look = postStatusLook(post);
  const image = post.media.find((m) => m.mimeType.startsWith("image/") && (m.previewUrl || m.originalUrl));
  const body = post.content.trim() ? escapeMarkdown(post.content) : "_No text_";
  const markdown = image ? `${body}\n\n![](${image.previewUrl ?? image.originalUrl})` : body;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={look.label} color={look.color} />
          </List.Item.Detail.Metadata.TagList>
          {post.scheduledAt && (
            <List.Item.Detail.Metadata.Label title="Scheduled For" text={formatDateTime(post.scheduledAt)} />
          )}
          {post.publishedAt && (
            <List.Item.Detail.Metadata.Label title="Published" text={formatDateTime(post.publishedAt)} />
          )}
          {post.rejectionReason && post.approvalStatus === "rejected" && (
            <List.Item.Detail.Metadata.Label title="Rejection Reason" text={post.rejectionReason} />
          )}
          {post.media.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Media"
              text={post.media.map((m) => m.fileName).join(", ")}
              icon={Icon.Image}
            />
          )}
          {post.labels.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Labels">
              {post.labels.map((l) => (
                <List.Item.Detail.Metadata.TagList.Item key={l.id} text={l.name} color={l.color || undefined} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          {post.destinations.map((d) => {
            const dl = destinationLook(d.status);
            const name = channelNames?.get(d.channelId) ?? platformLabel(d.platform);
            return d.url ? (
              <List.Item.Detail.Metadata.Link
                key={d.id}
                title={`${name} · ${dl.label}`}
                target={d.url}
                text="View Post"
              />
            ) : (
              <List.Item.Detail.Metadata.Label
                key={d.id}
                title={name}
                icon={platformIcon(d.platform)}
                text={{ value: d.error ? `${dl.label}: ${d.error}` : dl.label, color: dl.color }}
              />
            );
          })}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Post ID" text={String(post.id)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PostActions({
  post,
  onToggleDetail,
  onChange,
}: {
  post: Post;
  onToggleDetail: () => void;
  onChange: () => void;
}) {
  const failed = post.status === "failed" || post.status === "partial";
  const canPublish = post.status === "draft" || post.status === "scheduled";
  const live = post.destinations.filter((d) => d.url);

  async function run(title: string, done: string, fn: () => Promise<unknown>) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await fn();
      toast.style = Toast.Style.Success;
      toast.title = done;
      onChange();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong";
      toast.message = (e as Error).message;
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in BulkPublish" url={postEditUrl(post.id)} />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={onToggleDetail}
        />
        {live.length === 1 && (
          <Action.OpenInBrowser
            title={`Open on ${platformLabel(live[0].platform)}`}
            url={live[0].url!}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        )}
        {live.length > 1 && (
          <ActionPanel.Submenu title="Open Published Post…" icon={Icon.Globe} shortcut={Keyboard.Shortcut.Common.Open}>
            {live.map((d) => (
              <Action.OpenInBrowser
                key={d.id}
                title={platformLabel(d.platform)}
                icon={platformIcon(d.platform)}
                url={d.url!}
              />
            ))}
          </ActionPanel.Submenu>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {failed && (
          <Action
            title="Retry Failed Destinations"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => run("Retrying…", "Retry queued", () => retryPost(post.id))}
          />
        )}
        {canPublish && (
          <Action
            title="Publish Now"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Publish this post now?",
                  message: `It will go out to ${post.destinations.length} channel(s) right away.`,
                  primaryAction: { title: "Publish" },
                })
              )
                await run("Publishing…", "Publishing started", () => publishPost(post.id));
            }}
          />
        )}
        {post.status === "scheduled" && (
          <Action
            title="Move to Drafts"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => run("Unscheduling…", "Moved to drafts", () => unschedulePost(post.id))}
          />
        )}
        <Action.OpenInBrowser title="Post Again in BulkPublish" icon={Icon.Repeat} url={repostUrl(post.id)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Post Text"
          content={post.content}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {live.length > 0 && (
          <Action.CopyToClipboard
            title="Copy Published Links"
            content={live.map((d) => d.url).join("\n")}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          />
        )}
        <Action.OpenInBrowser title="Open Calendar" icon={Icon.Calendar} url={`${APP_URL}/calendar`} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChange}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Post"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Delete this post?",
                message:
                  post.status === "published" || post.status === "partial"
                    ? "This removes it from BulkPublish. Copies already published on your channels stay up."
                    : "This can't be undone.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              })
            )
              await run("Deleting…", "Post deleted", () => deletePost(post.id));
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/** Keep post text from being read as Markdown headings, lists or HTML. */
function escapeMarkdown(s: string): string {
  return s.replace(/([\\`*_{}[\]<>#|])/g, "\\$1").replace(/\n/g, "  \n");
}
