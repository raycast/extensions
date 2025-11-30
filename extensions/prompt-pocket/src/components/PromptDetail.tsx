import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Prompt } from "../types/prompt";

/**
 * プロンプト詳細表示
 * 各フィールドの詳細情報を一覧形式で表示
 */
interface PromptDetailProps {
  prompt: Prompt;
}

export function PromptDetail({ prompt }: PromptDetailProps) {
  return (
    <List navigationTitle={`Details: ${prompt.title}`}>
      <List.Item
        icon={Icon.Document}
        title="Title"
        subtitle={prompt.title}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Title" content={prompt.title} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={Icon.Text}
        title="Body"
        subtitle={
          prompt.body.length > 100
            ? prompt.body.slice(0, 100) + "..."
            : prompt.body
        }
        accessories={[{ text: `${prompt.body.length} chars` }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Body" content={prompt.body} />
          </ActionPanel>
        }
      />

      {prompt.tags && prompt.tags.length > 0 && (
        <List.Item
          icon={Icon.Tag}
          title="Tags"
          subtitle={prompt.tags.join(", ")}
          accessories={[{ text: `${prompt.tags.length} tags` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Tags"
                content={prompt.tags.join(", ")}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Item
        icon={Icon.Fingerprint}
        title="ID"
        subtitle={prompt.id}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Id" content={prompt.id} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={Icon.Calendar}
        title="Created At"
        subtitle={new Date(prompt.createdAt).toLocaleString()}
        accessories={[{ text: formatRelativeTime(new Date(prompt.createdAt)) }]}
      />

      <List.Item
        icon={Icon.Clock}
        title="Last Updated"
        subtitle={new Date(prompt.updatedAt).toLocaleString()}
        accessories={[{ text: formatRelativeTime(new Date(prompt.updatedAt)) }]}
      />

      {prompt.lastUsedAt && (
        <List.Item
          icon={Icon.Checkmark}
          title="Last Used"
          subtitle={new Date(prompt.lastUsedAt).toLocaleString()}
          accessories={[
            { text: formatRelativeTime(new Date(prompt.lastUsedAt)) },
          ]}
        />
      )}
    </List>
  );
}

/**
 * 相対時間を人間が読める形式にフォーマット
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
