import { useAI } from "@/utils/hooks/useAI";
import { Detail, LaunchProps, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

/**
 * 入力テキストをAI翻訳して結果を表示するコマンド
 */
export default function Command(props: LaunchProps) {
  const inputText = props.launchContext?.inputText || "";

  const { data: translatedText, isLoading, error, retry } = useAI(inputText);

  return (
    <Detail
      markdown={
        error
          ? `🚨 An error occurred during translation. Please try again.\n\n\`\`\`\n${error}\n\`\`\``
          : translatedText
      }
      isLoading={isLoading}
      actions={
        isLoading ? null : (
          <ActionPanel>
            {error ? (
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={retry}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            ) : (
              <Action.CopyToClipboard
                title="Copy Results"
                content={translatedText}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action.OpenInBrowser
              title="Open Usage Dashboard"
              icon={Icon.BarChart}
              url="https://platform.openai.com/settings/organization/usage"
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel>
        )
      }
    />
  );
}
