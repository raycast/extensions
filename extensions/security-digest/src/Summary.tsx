import {
  Detail,
  ActionPanel,
  Action,
  AI,
  environment,
  Color,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { SecurityItem } from "./types";
import { stripHtml } from "./utils";

export default function SummaryView({ item }: { item: SecurityItem }) {
  const cleanContent = stripHtml(item.content);
  const canAccessAI = environment.canAccess(AI);

  const prompt = `Summarize the following security news item for a security professional. 
Highlight the key threat, affected systems (if any), and recommended actions.
Keep it concise and professional.

Title: ${item.title}
Source: ${item.source}
Content: ${cleanContent}`;

  const { data, isLoading, error } = useAI(prompt, {
    execute: canAccessAI,
  });

  if (error) {
    return (
      <Detail
        markdown={`# AI Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Check Raycast AI Status"
              url="https://status.raycast.com"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!canAccessAI) {
    return (
      <Detail
        markdown="# AI Access Required\n\nThis feature requires **Raycast Pro**. Please upgrade to use built-in AI summaries."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Upgrade to Raycast Pro"
              url="https://www.raycast.com/pro"
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `
# AI Summary
${isLoading ? "Generating summary..." : data}

---
## Original Content
${cleanContent}

[Read full article](${item.link})
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`${item.title} - AI Summary`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Source" text={item.source} />
          <Detail.Metadata.Label
            title="Date"
            text={item.pubDate.toLocaleDateString()}
          />
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item
              text={item.category}
              color={getCategoryColor(item.category)}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.link} />
          <Action.CopyToClipboard title="Copy Summary" content={data || ""} />
        </ActionPanel>
      }
    />
  );
}

function getCategoryColor(category: string) {
  switch (category) {
    case "vulnerability":
      return Color.Red;
    case "intelligence":
      return Color.Orange;
    case "news":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}
