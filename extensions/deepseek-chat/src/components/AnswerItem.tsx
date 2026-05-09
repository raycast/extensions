import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface AnswerItemProps {
  text: string;
  status: "idle" | "streaming" | "done" | "error";
  onSubmit: () => void;
}

export function AnswerItem({ text, status, onSubmit }: AnswerItemProps) {
  const statusText =
    status === "streaming"
      ? "Answering..."
      : status === "error"
        ? "Error"
        : "Done";
  const preview = text.length > 80 ? text.slice(0, 80) + "..." : text;

  return (
    <List.Item
      title={statusText}
      subtitle={preview || undefined}
      icon={
        status === "streaming"
          ? Icon.CircleProgress
          : status === "error"
            ? Icon.Warning
            : Icon.Message
      }
      detail={
        <List.Item.Detail
          markdown={text || "Waiting for response..."}
          isLoading={status === "streaming"}
        />
      }
      actions={
        <ActionPanel>
          <Action title="New Question" onAction={onSubmit} />
          <Action.CopyToClipboard
            content={text}
            title="Copy Answer"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
