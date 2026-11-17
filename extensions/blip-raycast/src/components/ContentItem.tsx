import { Action, ActionPanel, Icon, List, type Image } from "@raycast/api";
import { contentKind, contentListTitle, contentLocation, contentTitle, type SendContent } from "../lib/content";
import { useMemo } from "react";
import { RecipientList } from "./RecipientList";

function contentIcon(content: SendContent): Image.ImageLike {
  switch (content.kind) {
    case "files":
      return { fileIcon: content.paths[0] };
    case "image":
      return { source: content.path };
    case "text":
      return Icon.Text;
  }
}

/** One thing that can be sent (clipboard, selection, typed text). Enter picks who to send it to. */
export function ContentItem({
  content,
  rememberForQuickSend,
}: {
  content: SendContent;
  rememberForQuickSend?: boolean;
}) {
  // contentKind checks files on disk; don't repeat that on every keystroke in the search bar.
  const subtitle = useMemo(
    () => [contentKind(content), contentLocation(content)].filter(Boolean).join(" · "),
    [content],
  );
  return (
    <List.Item
      icon={contentIcon(content)}
      title={contentListTitle(content)}
      subtitle={subtitle}
      actions={
        <ActionPanel title={`Send ${contentTitle(content)}`}>
          <Action.Push
            title="Choose Recipient"
            icon={Icon.ArrowRight}
            target={<RecipientList content={content} rememberForQuickSend={rememberForQuickSend} isNested />}
          />
        </ActionPanel>
      }
    />
  );
}
