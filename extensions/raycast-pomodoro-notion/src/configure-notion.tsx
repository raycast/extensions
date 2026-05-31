import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  REQUIRED_FOCUS_OPTIONS,
  REQUIRED_DATABASE_SCHEMA,
  validatePomodoroDatabase,
  type ValidationResult,
} from "./lib/notion";
import { getNotionSettings } from "./lib/preferences";

type ValidationState = {
  isLoading: boolean;
  result?: ValidationResult;
  error?: string;
};

function buildMarkdown(state: ValidationState): string {
  const { notionToken, notionDatabaseId } = getNotionSettings();
  const lines: string[] = [
    "# Notion接続設定",
    "",
    "## 現在の設定",
    "",
    `- Token: ${notionToken ? "設定済み" : "未設定"}`,
    `- Database ID: ${notionDatabaseId ? `\`${notionDatabaseId}\`` : "未設定"}`,
    "",
    "## 必須プロパティ",
    "",
  ];

  for (const [name, propertyType] of Object.entries(REQUIRED_DATABASE_SCHEMA)) {
    lines.push(`- \`${name}\`: \`${propertyType}\``);
  }

  lines.push("", "## 検証結果", "");

  if (state.isLoading) {
    lines.push("検証中です...");
    return lines.join("\n");
  }

  if (state.error) {
    lines.push(`- 状態: 失敗`, `- 内容: ${state.error}`);
    return lines.join("\n");
  }

  if (!state.result) {
    lines.push(
      "まだ検証していません。Action から `接続確認` を実行してください。",
    );
    return lines.join("\n");
  }

  lines.push(`- 状態: ${state.result.ok ? "OK" : "要修正"}`);
  if (state.result.databaseTitle) {
    lines.push(`- データベース名: ${state.result.databaseTitle}`);
  }

  if (state.result.missingProperties.length > 0) {
    lines.push(
      "",
      "### 不足プロパティ",
      "",
      ...state.result.missingProperties.map((name) => `- \`${name}\``),
    );
  }

  if (state.result.invalidProperties.length > 0) {
    lines.push("", "### 型不一致", "");
    for (const property of state.result.invalidProperties) {
      lines.push(
        `- \`${property.name}\`: expected \`${property.expected}\`, actual \`${property.actual}\``,
      );
    }
  }

  if (state.result.focusOptions.length > 0) {
    lines.push(
      "",
      "### Focus の選択肢",
      "",
      ...state.result.focusOptions.map((name) => `- ${name}`),
    );
  }

  if (state.result.sessionTypeOptions.length > 0) {
    lines.push(
      "",
      "### Session Type の選択肢",
      "",
      ...state.result.sessionTypeOptions.map((name) => `- ${name}`),
    );
  }

  if (state.result.missingFocusOptions.length > 0) {
    lines.push(
      "",
      "### Focus の警告",
      "",
      `- 推奨選択肢: ${REQUIRED_FOCUS_OPTIONS.join(", ")}`,
      `- 未検出: ${state.result.missingFocusOptions.join(", ")}`,
      "",
      "現在の作業ログ入力フォームは既定で `高` / `中` / `低` を使います。",
      "ただし、必須プロパティと型が正しければ接続自体は有効です。",
    );
  }

  if (state.result.missingSessionTypeOptions.length > 0) {
    lines.push(
      "",
      "### Session Type の警告",
      "",
      `- 拡張で設定済みの作業種類のうち、Notion 側で未検出: ${state.result.missingSessionTypeOptions.join(", ")}`,
      "",
      "作業種類は Select として保存する前提です。Notion の `Session Type` プロパティに同じ選択肢を追加してください。",
    );
  }

  if (state.result.ok) {
    lines.push("", "既存のこのデータベースへ、次回起動時も再接続可能です。");
  }

  return lines.join("\n");
}

export default function ConfigureNotionCommand() {
  const [state, setState] = useState<ValidationState>({ isLoading: false });
  const { notionToken, notionDatabaseId } = getNotionSettings();

  async function validateConnection() {
    if (!notionToken || !notionDatabaseId) {
      setState({
        isLoading: false,
        error: "Notion Token または Database ID が未設定です。",
      });
      return;
    }

    setState({ isLoading: true });

    try {
      const result = await validatePomodoroDatabase(
        notionToken,
        notionDatabaseId,
      );
      setState({
        isLoading: false,
        result,
      });

      await showToast({
        style: result.ok ? Toast.Style.Success : Toast.Style.Failure,
        title: result.ok
          ? result.missingFocusOptions.length > 0
            ? "Notion接続を確認しました（警告あり）"
            : "Notion接続を確認しました"
          : "Notion構成に修正が必要です",
        message:
          result.ok &&
          (result.missingFocusOptions.length > 0 ||
            result.missingSessionTypeOptions.length > 0)
            ? [
                result.missingFocusOptions.length > 0
                  ? `Focus 警告: ${result.missingFocusOptions.join(", ")}`
                  : null,
                result.missingSessionTypeOptions.length > 0
                  ? `Session Type 警告: ${result.missingSessionTypeOptions.join(", ")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" / ")
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      setState({
        isLoading: false,
        error: message,
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Notion接続の確認に失敗しました",
        message,
      });
    }
  }

  useEffect(() => {
    if (notionToken && notionDatabaseId) {
      validateConnection();
    }
  }, [notionToken, notionDatabaseId]);

  const markdown = useMemo(() => buildMarkdown(state), [state]);

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="接続確認"
            icon={Icon.CheckCircle}
            onAction={validateConnection}
          />
          <Action
            title="Extension Preferences を開く"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
