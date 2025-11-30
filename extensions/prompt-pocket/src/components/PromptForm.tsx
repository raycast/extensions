import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Prompt, PromptFormValues } from "../types/prompt";
import { createPrompt, updatePrompt } from "../lib/promptStorage";
import { showSuccessToast, showErrorToast } from "../lib/toastUtils";

/**
 * プロンプト作成・編集フォーム
 * 新規作成と編集の両方に対応
 */
interface PromptFormProps {
  prompt?: Prompt;
  onSave: () => void;
}

export function PromptForm({ prompt, onSave }: PromptFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // バリデーションエラーの状態管理
  const [titleError, setTitleError] = useState<string | undefined>();
  const [bodyError, setBodyError] = useState<string | undefined>();

  /**
   * フォーム送信時のバリデーションと保存処理
   */
  async function handleSubmit(values: PromptFormValues) {
    // バリデーション
    setTitleError(undefined);
    setBodyError(undefined);

    if (!values.title.trim()) {
      setTitleError("Title is required");
      await showErrorToast("Validation Error", new Error("Title is required"));
      return;
    }

    if (!values.body.trim()) {
      setBodyError("Body is required");
      await showErrorToast("Validation Error", new Error("Body is required"));
      return;
    }

    setIsLoading(true);

    try {
      // タグをパース（カンマ区切り文字列を配列に変換）
      const tags = parseTagsFromString(values.tags);

      if (prompt) {
        // 既存プロンプトを更新
        await updatePrompt(prompt.id, {
          title: values.title.trim(),
          body: values.body.trim(),
          tags,
        });
        await showSuccessToast(
          "Prompt Updated",
          `"${values.title}" has been updated`,
        );
      } else {
        // 新規プロンプトを作成
        await createPrompt({
          title: values.title.trim(),
          body: values.body.trim(),
          tags,
        });
        await showSuccessToast(
          "Prompt Created",
          `"${values.title}" has been created`,
        );
      }

      // 成功したら親コンポーネントを更新してフォームを閉じる
      onSave();
      pop();
    } catch (error) {
      await showErrorToast("Failed to Save Prompt", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={prompt ? "Edit Prompt" : "Create New Prompt"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={prompt ? "Update Prompt" : "Create Prompt"}
            icon={prompt ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Code Review Template"
        defaultValue={prompt?.title || ""}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />

      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Enter your prompt text here...&#10;&#10;You can use placeholders like {clipboard} and {cursor}"
        defaultValue={prompt?.body || ""}
        error={bodyError}
        onChange={() => setBodyError(undefined)}
        enableMarkdown
        info="Use {clipboard} to insert current clipboard content, {cursor} to set cursor position after paste"
      />

      <Form.Description
        title="Available Placeholders"
        text="• {clipboard} - Replaced with current clipboard content&#10;• {cursor} - Cursor will move to this position after pasting"
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="work, ai, coding"
        defaultValue={prompt?.tags?.join(", ") || ""}
        info="Use comma-separated tags to organize your prompts (e.g., work, ai, coding)"
      />

      {prompt && (
        <Form.Description
          title="Info"
          text={`Created: ${new Date(prompt.createdAt).toLocaleString()}\nLast Updated: ${new Date(prompt.updatedAt).toLocaleString()}${prompt.lastUsedAt ? `\nLast Used: ${new Date(prompt.lastUsedAt).toLocaleString()}` : ""}`}
        />
      )}
    </Form>
  );
}

/**
 * カンマ区切りの文字列をタグ配列にパース
 */
function parseTagsFromString(tagsString: string): string[] | undefined {
  if (!tagsString.trim()) {
    return undefined;
  }

  const tags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return tags.length > 0 ? tags : undefined;
}
