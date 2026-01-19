import { ActionPanel, Action, Detail, Icon, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { HotKey, EnhancedClipboardData } from "../types";
import { ChatView, createMessageContent } from "../clipyai";

export function ResultView({
  result,
  clipboardData,
  hotkey,
}: {
  result: string;
  clipboardData: EnhancedClipboardData;
  hotkey: HotKey;
}) {
  const { push, pop } = useNavigation();

  const expandToChat = useCallback(async () => {
    const userContent = createMessageContent(hotkey.prompt, clipboardData);
    const initialMessages = [
      { role: "user" as const, content: userContent },
      { role: "assistant" as const, content: result },
    ];
    push(<ChatView initialMessages={initialMessages} />);
  }, [result, clipboardData, hotkey, push]);

  return (
    <Detail
      markdown={`# ${hotkey.title}

${result}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Result Actions">
            <Action.CopyToClipboard title="Copy Result" content={result} />
            <Action title="Expand to Chat" icon={Icon.Message} onAction={expandToChat} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Action" text={hotkey.title} />
          <Detail.Metadata.Label title="Characters" text={result.length.toString()} />
          <Detail.Metadata.Label title="Words" text={result.split(" ").length.toString()} />
          {clipboardData.images && clipboardData.images.length > 0 && (
            <Detail.Metadata.Label title="Images" text={clipboardData.images.length.toString()} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
