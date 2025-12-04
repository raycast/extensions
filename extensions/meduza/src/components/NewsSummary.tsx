import { ActionPanel, Action, Detail, AI, Icon } from "@raycast/api";
import { useAI, useCachedState } from "@raycast/utils";
import { Language } from "../types";
import { useFeedData } from "../hooks/useFeedData";
import { stripHtml } from "../utils/helpers";

export function NewsSummary(): JSX.Element {
  const [language, setLanguage] = useCachedState<Language>("language");
  const feedKey = language ?? "en";

  const { data: items = [], isLoading } = useFeedData(feedKey);

  const newsDigest = items
    .map((item) => `${item.title}\n${item.pubDate} ${item.link}\n${stripHtml(item.content)}`)
    .join("\n\n");

  const prompt = `Create a structured summary with "read more" links to meduza.io and date main news based on these articles. 
       Divide by categories (politics, society, economy, etc.). 
       Use emojis for news.
       Wish a good day by summarizing at the start.
       News:\n\n${newsDigest}
       
       Respond in ${feedKey} language`;

  const { data: summary, isLoading: isSummaryLoading } = useAI(prompt, {
    model: AI.Model["Anthropic_Claude_Sonnet"],
    creativity: 0.1,
    stream: true,
  });

  const title = "News Digest";
  const loadingText = "Generating news summary...";

  const markdown = `${isSummaryLoading ? loadingText : ""}

${summary || ""}
  `;

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      isLoading={isLoading || isSummaryLoading}
      actions={
        <ActionPanel>
          <Action.Open
            title={"Chat"}
            target={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${summary}`}
          />
          <Action.CopyToClipboard
            content={summary || ""}
            title={"Copy Summary"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title={"Change Language"}
            icon={Icon.Globe}
            onAction={() => setLanguage(feedKey === "ru" ? "en" : "ru")}
          />
        </ActionPanel>
      }
    />
  );
}
