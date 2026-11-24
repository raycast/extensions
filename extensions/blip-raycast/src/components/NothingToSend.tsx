import { Action, ActionPanel, Icon, Keyboard, List, type Image } from "@raycast/api";
import { useState } from "react";
import { ContentItem } from "./ContentItem";
import { ChooseFilesAction, TypeTextAction } from "./SendActions";

/**
 * Shown when the clipboard or selection turned out to be empty (or unreadable).
 * Offers the alternatives, and like Send, anything typed in the search bar can be sent as text.
 */
export function NothingToSend({
  icon,
  title,
  description,
  prefer,
  onRetry,
  rememberForQuickSend,
}: {
  icon: Image.ImageLike;
  title: string;
  description: string;
  /** Which alternative comes first. */
  prefer: "text" | "files";
  onRetry: () => void;
  rememberForQuickSend?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const alternatives =
    prefer === "text"
      ? [
          <TypeTextAction key="text" rememberForQuickSend={rememberForQuickSend} />,
          <ChooseFilesAction key="files" rememberForQuickSend={rememberForQuickSend} />,
        ]
      : [
          <ChooseFilesAction key="files" rememberForQuickSend={rememberForQuickSend} />,
          <TypeTextAction key="text" rememberForQuickSend={rememberForQuickSend} />,
        ];
  const retry = (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRetry}
    />
  );

  return (
    <List filtering={false} onSearchTextChange={setTyped} searchBarPlaceholder="Type text to send">
      {typed.trim() ? (
        <List.Section title="Typed Text">
          <ContentItem
            content={{ kind: "text", text: typed, source: "Typed" }}
            rememberForQuickSend={rememberForQuickSend}
          />
        </List.Section>
      ) : (
        <List.EmptyView
          icon={icon}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              {alternatives}
              {retry}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
