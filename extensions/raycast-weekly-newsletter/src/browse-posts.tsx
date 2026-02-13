import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { fetchPost, fetchPosts, getPostUrl } from "./api/substack";
import type { SubstackPost } from "./types/post";
import { htmlToMarkdown } from "./utils/html-to-markdown";

export default function Command() {
  const { data: posts, isLoading } = usePromise(fetchPosts, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Failed to fetch posts" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search posts...">
      {posts?.map((post) => (
        <PostListItem key={post.id} post={post} />
      ))}
    </List>
  );
}

function PostListItem({ post }: { post: SubstackPost }) {
  const date = new Date(post.post_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const accessories: List.Item.Accessory[] = [
    { icon: Icon.Heart, text: String(post.reaction_count), tooltip: "Likes" },
    {
      icon: Icon.Bubble,
      text: String(post.comment_count),
      tooltip: "Comments",
    },
    {
      icon: Icon.Clock,
      text: `${post.reading_time} min`,
      tooltip: "Reading time",
    },
  ];

  return (
    <List.Item
      icon={post.cover_image ? { source: post.cover_image } : Icon.Document}
      title={post.title}
      subtitle={post.subtitle || undefined}
      accessories={accessories}
      keywords={[post.title, post.subtitle || "", date]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Eye} title="Read Post" target={<PostDetail slug={post.slug} />} />
            <Action.OpenInBrowser url={getPostUrl(post.slug)} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Link"
              content={getPostUrl(post.slug)}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            <Action.CopyToClipboard
              title="Copy Share Text"
              content={`${post.title}\n${getPostUrl(post.slug)}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PostDetail({ slug }: { slug: string }) {
  const { data: post, isLoading } = usePromise(fetchPost, [slug], {
    onError: (error) => {
      showFailureToast(error, { title: "Failed to fetch post" });
    },
  });

  if (isLoading || !post) {
    return <Detail isLoading={true} />;
  }

  const markdown = generatePostMarkdown(post);
  const metadata = generatePostMetadata(post);

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={getPostUrl(slug)} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={getPostUrl(slug)}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function generatePostMarkdown(post: SubstackPost): string {
  const header = `# ${post.title}\n\n`;
  const subtitle = post.subtitle ? `*${post.subtitle}*\n\n---\n\n` : "";
  const content = htmlToMarkdown(post.body_html);

  return `${header}${subtitle}${content}`;
}

function generatePostMetadata(post: SubstackPost) {
  const date = new Date(post.post_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Published" text={date} icon={Icon.Calendar} />
      <Detail.Metadata.Label title="Reading Time" text={`${post.reading_time} min`} icon={Icon.Clock} />
      <Detail.Metadata.Label title="Word Count" text={post.wordcount.toLocaleString()} icon={Icon.Text} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Likes" text={String(post.reaction_count)} icon={Icon.Heart} />
      <Detail.Metadata.Label title="Comments" text={String(post.comment_count)} icon={Icon.Bubble} />
      <Detail.Metadata.Label title="Restacks" text={String(post.restacks)} icon={Icon.ArrowNe} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="View Online" target={getPostUrl(post.slug)} text="Open in Browser" />
    </Detail.Metadata>
  );
}
