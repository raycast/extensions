import { Detail, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { DisplayPost } from "../api/types";
import { getPostTextContent, getSummarizePrompt, getTranslatePrompt, getKeyPointsPrompt } from "../utils/ai-helpers";
import { formatDate, formatNumber } from "../utils/formatters";

type AIMode = "summarize" | "translate" | "keypoints";

interface AIPostViewProps {
  readonly post: DisplayPost;
  readonly mode: AIMode;
}

const modeConfig: Record<AIMode, { title: string; icon: Icon; getPrompt: (content: string) => string }> = {
  summarize: {
    title: "Summary",
    icon: Icon.Document,
    getPrompt: getSummarizePrompt,
  },
  translate: {
    title: "Translation",
    icon: Icon.Globe,
    getPrompt: getTranslatePrompt,
  },
  keypoints: {
    title: "Key Points",
    icon: Icon.BulletPoints,
    getPrompt: getKeyPointsPrompt,
  },
};

export function AIPostView({ post, mode }: AIPostViewProps) {
  const config = modeConfig[mode];
  const postContent = getPostTextContent(post);
  const prompt = config.getPrompt(postContent);

  const { data, isLoading } = useAI(prompt, {
    creativity: "low",
    stream: true,
  });

  const showSubsite = post.subsite.name && post.subsite.name.length > 0;

  // Build markdown content
  let markdown = `# ${config.title}: ${post.title}\n\n`;

  if (isLoading && !data) {
    markdown += "*Generating with AI...*";
  } else if (data) {
    markdown += data;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`${config.title} — ${post.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="AI Mode" text={config.title} icon={config.icon} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Author"
            text={post.author.name}
            icon={post.author.avatar ? { source: post.author.avatar, mask: Image.Mask.Circle } : Icon.Person}
          />
          {showSubsite && (
            <Detail.Metadata.Label
              title="Topic"
              text={post.subsite.name}
              icon={post.subsite.avatar ? { source: post.subsite.avatar, mask: Image.Mask.Circle } : Icon.Folder}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Views" text={formatNumber(post.stats.views)} icon={Icon.Eye} />
          <Detail.Metadata.Label title="Comments" text={formatNumber(post.stats.comments)} icon={Icon.Bubble} />
          <Detail.Metadata.Label title="Likes" text={formatNumber(post.stats.likes)} icon={Icon.Heart} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Date" text={formatDate(post.date)} icon={Icon.Calendar} />
          <Detail.Metadata.Link title="Original" target={post.url} text="Open on DTF" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={post.url} title="Open Original in Browser" />
            {data && <Action.CopyToClipboard content={data} title={`Copy ${config.title}`} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={post.url} title="Copy Link" />
            <Action.CopyToClipboard content={post.title} title="Copy Title" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
