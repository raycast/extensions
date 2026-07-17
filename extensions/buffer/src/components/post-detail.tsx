import { ActionPanel, Detail } from "@raycast/api";
import { Post } from "../lib/types";
import { firstImageThumbnail, formatDate, formatMetricValue, serviceLabel } from "../lib/format";
import { PostActions } from "./post-actions";

export function PostDetail({ post, onMutate }: { post: Post; onMutate?: () => void }) {
  const image = firstImageThumbnail(post);
  // Metrics only make sense for published posts – drafts/scheduled have none.
  const showMetrics = post.status === "sent" && !!post.metrics && post.metrics.length > 0;
  const parts: string[] = [];

  parts.push(post.text || "_No text_");

  if (image) {
    // Wrap the URL in angle brackets so parentheses/spaces in asset URLs don't
    // break Markdown image parsing.
    parts.push(`\n\n![media](<${image}>)`);
  }

  const otherAssets = (post.assets ?? []).filter((a) => (a.thumbnail || a.source) !== image);
  if (otherAssets.length > 0) {
    parts.push(`\n\n**Attachments:** ${otherAssets.length} more`);
  }

  const markdown = parts.join("");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={serviceLabel(post.channelService)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Channel" text={post.channel?.displayName || post.channel?.name || "–"} />
          <Detail.Metadata.Label title="Network" text={serviceLabel(post.channelService)} />
          <Detail.Metadata.Label title="Status" text={post.status} />
          {post.dueAt && <Detail.Metadata.Label title="Scheduled" text={formatDate(post.dueAt)} />}
          {post.sentAt && <Detail.Metadata.Label title="Published" text={formatDate(post.sentAt)} />}
          {showMetrics && <Detail.Metadata.Separator />}
          {showMetrics &&
            post.metrics?.map((m) => (
              <Detail.Metadata.Label key={m.type + m.name} title={m.name} text={formatMetricValue(m)} />
            ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PostActions post={post} onMutate={onMutate} />
        </ActionPanel>
      }
    />
  );
}
