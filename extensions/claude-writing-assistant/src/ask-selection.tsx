import { Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Chat } from "./components/Chat";
import { readInput } from "./lib/quick";
import { settings } from "./lib/settings";

export default function Command(props: LaunchProps<{ arguments: Arguments.AskSelection }>) {
  const { data: input, isLoading } = usePromise(() => readInput(settings().clipboardFallback).catch(() => null));
  const question = props.arguments.question?.trim() ?? "";

  if (isLoading) return <List isLoading searchBarPlaceholder="Reading selection…" />;
  if (!input) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.TextCursor}
          title="No text selected"
          description="Select text in any app (or copy it) and run the command again."
        />
      </List>
    );
  }
  return (
    <Chat
      seed={{
        prompt: question,
        attachments: [{ kind: "selection", text: input.text, source: input.source }],
        send: question.length > 0,
        placeholder: "Ask about the selected text… (leave empty for an explanation)",
      }}
    />
  );
}
