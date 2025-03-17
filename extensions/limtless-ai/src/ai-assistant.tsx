import { showToast, Toast, Detail, List, ActionPanel, Action, openExtensionPreferences, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { LimitlessAPI } from "./utils/api";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [lifelogData, setLifelogData] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const api = LimitlessAPI.getInstance();

  useEffect(() => {
    fetchLifelogData();
  }, []);

  async function fetchLifelogData() {
    try {
      if (!api.hasApiKey()) {
        setError("Please set your Limitless API key in the extension preferences.");
        setIsLoading(false);
        return;
      }

      // Fetch the most recent lifelogs
      const response = await api.getLifelogs({
        limit: 30, // Fetch a reasonable number of recent lifelogs
        direction: "desc",
        includeMarkdown: true,
        includeHeadings: true,
      });

      // Format the lifelog data into a readable context
      const lifelogsContext = response.data.lifelogs
        .map((lifelog) => {
          // Find a date from the first content block with a startTime
          const dateBlock = lifelog.contents.find((block) => block.startTime);
          const dateStr = dateBlock?.startTime ? new Date(dateBlock.startTime).toLocaleString() : "Unknown date";

          // Format content from the lifelog
          const formattedContent = lifelog.contents
            .map((content) => {
              if (content.type === "heading1") {
                return `# ${content.content}`;
              } else if (content.type === "heading2") {
                return `## ${content.content}`;
              } else if (content.type === "blockquote") {
                return `> ${content.content}`;
              } else {
                return content.content;
              }
            })
            .filter((text) => text.trim().length > 0)
            .join("\n\n");

          return `--- LIFELOG: ${lifelog.title} (${dateStr}) ---\n\n${formattedContent}\n\n`;
        })
        .join("\n\n");

      setLifelogData(lifelogsContext);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lifelog data");
      setIsLoading(false);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch lifelog data",
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error: ${error}`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading your lifelog data..." />;
  }

  return (
    <Detail
      markdown={`# Analyze Your Lifelogs with AI

You can ask questions about your lifelogs and get AI-powered answers based on your data.

## Example questions you could ask:

* What topics have I been talking about recently?
* Summarize my conversations from last week
* When was my most recent conversation?
* What was discussed in my latest meeting?

The AI will analyze the data from your 30 most recent lifelogs to provide answers.`}
      actions={
        <ActionPanel>
          <Action
            title="Ask AI Assistant"
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            onAction={async () => {
              showToast({
                style: Toast.Style.Animated,
                title: "Analyzing your lifelogs...",
              });

              // This will open Raycast AI with the context data
              // Note: You'll need to copy and paste your question and the context
              const aiPrompt = `
Context about my Limitless Pendant lifelogs:
${lifelogData}

Based on the above context from my lifelogs, please provide a detailed answer to my question. If you don't find relevant information in the data, let me know.
`;

              // Copy to clipboard using Raycast's Clipboard API
              await Clipboard.copy(aiPrompt);

              showToast({
                style: Toast.Style.Success,
                title: "Context copied to clipboard",
                message: "Paste this into Raycast AI (⌘+/) to ask your question",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
