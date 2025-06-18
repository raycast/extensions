import { List, Detail, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCachedPrompts } from "./storage";
import { Prompt } from "./types";

function PromptDetail({ prompt }: { prompt: Prompt }) {
  const markdown = `# ${prompt.title}

${prompt.description ? `**Description:** ${prompt.description}\n\n` : ""}**Content:**\n\n\`\`\`\n${prompt.content}\n\`\`\`\n\n${prompt.tags && prompt.tags.length > 0 ? `**Tags:** ${prompt.tags.join(", ")}` : ""}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={prompt.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={prompt.title}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://pb.onlinestool.com/prompt`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const cachedPrompts = await getCachedPrompts();
      setPrompts(cachedPrompts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Load Failed",
        message: "Unable to load prompts, please check network connection",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredPrompts = prompts.filter((prompt) => {
    const searchLower = searchText.toLowerCase();
    return (
      prompt.title.toLowerCase().includes(searchLower) ||
      prompt.content.toLowerCase().includes(searchLower) ||
      (prompt.description && prompt.description.toLowerCase().includes(searchLower)) ||
      (prompt.tags && prompt.tags.some((tag) => tag.toLowerCase().includes(searchLower)))
    );
  });

  async function copyToClipboard(content: string) {
    await Clipboard.copy(content);
    showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: "Prompt content copied to clipboard",
    });
  }

  async function pasteToFrontmostApp(content: string) {
    await Clipboard.paste(content);
    showToast({
      style: Toast.Style.Success,
      title: "Pasted",
      message: "Prompt content pasted to frontmost application",
    });
  }

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
      throttle
    >
      {filteredPrompts.length === 0 && !loading ? (
        <List.EmptyView
          title="No Prompts Found"
          description={
            searchText
              ? "Try searching with different keywords"
              : "Please sync data first or add new prompts"
          }
        />
      ) : (
        filteredPrompts.map((prompt, index) => (
          <List.Item
            key={prompt.id || index}
            title={prompt.title}
            subtitle={prompt.description}
            accessories={[...(prompt.tags || []).map((tag) => ({ text: tag }))]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={() => copyToClipboard(prompt.content)}
                  icon="📋"
                />
                <Action
                  title="Paste to Frontmost App"
                  onAction={() => pasteToFrontmostApp(prompt.content)}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  icon="📝"
                />
                <Action.Push
                  title="View Details"
                  target={<PromptDetail prompt={prompt} />}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon="👁"
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={prompt.title}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://pb.onlinestool.com/prompt`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
