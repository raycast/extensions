import { Action, ActionPanel, Detail, Clipboard, showHUD } from "@raycast/api";

interface QuickAIResultProps {
  question: string;
  response: string;
  isLoading: boolean;
  onContinueInChat?: () => void;
}

export function QuickAIResult({ question, response, isLoading, onContinueInChat }: QuickAIResultProps) {
  const markdown = response || (isLoading ? "Thinking..." : "");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Question" text={question} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Response"
              content={response}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Paste Response"
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={async () => {
                await Clipboard.paste(response);
                await showHUD("Pasted to active app");
              }}
            />
          </ActionPanel.Section>
          {onContinueInChat && (
            <ActionPanel.Section>
              <Action
                title="Continue in Chat"
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={onContinueInChat}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Question"
              content={question}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
