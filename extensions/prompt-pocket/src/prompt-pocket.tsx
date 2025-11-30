import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePrompts } from "./hooks/usePrompts";
import { usePromptActions } from "./hooks/usePromptActions";
import { hasPlaceholders } from "./lib/placeholder";
import { truncateText } from "./lib/utils";
import { showErrorToast } from "./lib/toastUtils";
import { Prompt } from "./types/prompt";
import { PromptForm } from "./components/PromptForm";
import { PromptDetail } from "./components/PromptDetail";

/**
 * メインコマンド: Manage Prompts
 * プロンプトの一覧表示・検索・管理を行うメインビュー
 */
export default function ManagePromptsCommand() {
  const [searchText, setSearchText] = useState("");
  const { prompts, isLoading, error, reload, remove } = usePrompts();
  const actions = usePromptActions();

  // エラー表示
  useEffect(() => {
    if (error) {
      showErrorToast("Failed to Load Prompts", error);
    }
  }, [error]);

  // 検索フィルタリング
  const filteredPrompts = prompts.filter((prompt) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      prompt.title.toLowerCase().includes(query) ||
      prompt.body.toLowerCase().includes(query) ||
      prompt.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts by title, body, or tags..."
      filtering={false}
    >
      {/* 空の状態の表示 */}
      <List.EmptyView
        icon={Icon.Document}
        title="No Prompts Found"
        description={
          searchText
            ? "No prompts match your search. Try different keywords."
            : "Create your first prompt to get started"
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Create New Prompt"
              icon={Icon.Plus}
              target={<PromptForm onSave={reload} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />

      {/* プロンプト一覧 */}
      {filteredPrompts.map((prompt) => (
        <PromptListItem
          key={prompt.id}
          prompt={prompt}
          onRefresh={reload}
          onDelete={() => remove(prompt.id)}
          actions={actions}
        />
      ))}
    </List>
  );
}

/**
 * プロンプトリストアイテム
 * 各プロンプトの表示とアクションを管理
 */
interface PromptListItemProps {
  prompt: Prompt;
  onRefresh: () => void;
  onDelete: () => Promise<void>;
  actions: ReturnType<typeof usePromptActions>;
}

function PromptListItem({
  prompt,
  onRefresh,
  onDelete,
  actions,
}: PromptListItemProps) {
  const hasPH = hasPlaceholders(prompt.body);

  return (
    <List.Item
      icon={Icon.Document}
      title={prompt.title}
      subtitle={truncateText(prompt.body, 60)}
      accessories={[
        ...(prompt.tags?.map((tag) => ({
          tag: { value: tag, color: Color.Blue },
        })) ?? []),
        {
          date: new Date(prompt.lastUsedAt || prompt.updatedAt),
          tooltip: prompt.lastUsedAt
            ? `Last Used: ${new Date(prompt.lastUsedAt).toLocaleString()}`
            : `Updated: ${new Date(prompt.updatedAt).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          {/* 主要アクション: コピー・ペースト */}
          <ActionPanel.Section title="Quick Actions">
            {hasPH ? (
              <>
                <Action
                  title="Paste Filled Prompt to Active App"
                  icon={Icon.ArrowRight}
                  onAction={() => actions.pasteFilledPrompt(prompt)}
                />
                <Action
                  title="Copy Filled Prompt to Clipboard"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => actions.copyFilledPrompt(prompt)}
                />
                <Action
                  title="Copy Raw Prompt"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => actions.copyToClipboard(prompt)}
                />
              </>
            ) : (
              <>
                <Action
                  title="Paste to Active App"
                  icon={Icon.ArrowRight}
                  onAction={() => actions.pasteToActiveApp(prompt)}
                />
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => actions.copyToClipboard(prompt)}
                />
              </>
            )}
          </ActionPanel.Section>

          {/* 管理アクション: 作成・編集・削除 */}
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Edit Prompt"
              icon={Icon.Pencil}
              target={<PromptForm prompt={prompt} onSave={onRefresh} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.Push
              title="Create New Prompt"
              icon={Icon.Plus}
              target={<PromptForm onSave={onRefresh} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Delete Prompt"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => actions.deleteWithConfirmation(prompt, onDelete)}
            />
          </ActionPanel.Section>

          {/* 詳細表示 */}
          <ActionPanel.Section title="Details">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<PromptDetail prompt={prompt} />}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard
              title="Copy Prompt Id"
              content={prompt.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
