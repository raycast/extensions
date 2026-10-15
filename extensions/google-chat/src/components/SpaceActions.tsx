import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { JSX } from "react";

import type { SpaceItem } from "../api/types";
import { spaceUrl } from "../helpers/links";
import { OpenInChatAction } from "./OpenInChatAction";
import { SendMessageForm } from "./SendMessageForm";
import { SpaceMessages } from "./SpaceMessages";

/** Pushes the Send Message form with this space as the recipient. */
export function SendMessageAction({ item, onSent }: { item: SpaceItem; onSent?: () => void }) {
  return (
    <Action.Push
      title="Send Message"
      icon={Icon.Message}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SendMessageForm recipient={item.space.name} recipientTitle={item.title} onSent={onSent} />}
    />
  );
}

interface SpaceActionsProps {
  item: SpaceItem;
  onVisit?: () => void;
  onChange?: () => void;
  children?: JSX.Element | JSX.Element[] | null;
}

/** View Messages, Send Message, Open and Copy Link for a space. */
export function SpaceActions({ item, onVisit, children }: SpaceActionsProps) {
  const url = spaceUrl(item.space);
  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section>
        <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} onPush={onVisit} />
        <SendMessageAction item={item} onSent={onVisit} />
        <OpenInChatAction url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
        {item.email ? (
          <Action.CopyToClipboard
            title="Copy Email"
            content={item.email}
            shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
          />
        ) : null}
        {children}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
