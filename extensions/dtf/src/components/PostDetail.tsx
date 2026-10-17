import { List, Icon, Image } from "@raycast/api";
import { DisplayPost } from "../api/types";
import { formatDate, formatNumber } from "../utils/formatters";

interface PostDetailProps {
  readonly post: DisplayPost;
  readonly showMetadata?: boolean;
}

export function PostDetail({ post, showMetadata = false }: PostDetailProps) {
  // Standard markdown syntax for images
  const coverMarkdown = post.coverImage ? `![](${post.coverImage})\n\n` : "";

  const excerptMarkdown = post.excerpt ? `${post.excerpt}\n\n` : "";

  const markdown = `${coverMarkdown}## ${post.title}\n\n${excerptMarkdown}`.trim();

  const showSubsite = post.subsite.name && post.subsite.name.length > 0;

  if (!showMetadata) {
    return <List.Item.Detail markdown={markdown} />;
  }

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={post.author.name}
            icon={post.author.avatar ? { source: post.author.avatar, mask: Image.Mask.Circle } : Icon.Person}
          />
          {showSubsite && (
            <List.Item.Detail.Metadata.Label
              title="Topic"
              text={post.subsite.name}
              icon={post.subsite.avatar ? { source: post.subsite.avatar, mask: Image.Mask.Circle } : Icon.Folder}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Views" text={formatNumber(post.stats.views)} icon={Icon.Eye} />
          <List.Item.Detail.Metadata.Label
            title="Comments"
            text={formatNumber(post.stats.comments)}
            icon={Icon.Bubble}
          />
          <List.Item.Detail.Metadata.Label title="Likes" text={formatNumber(post.stats.likes)} icon={Icon.Heart} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDate(post.date)} />
          <List.Item.Detail.Metadata.Link title="Open" target={post.url} text="On DTF website" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
