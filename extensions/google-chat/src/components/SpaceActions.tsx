import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import type { JSX } from "react";

import type { SpaceItem } from "../api/types";
import { markRead } from "../api/unread";
import { showChatError } from "../helpers/feedback";
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

/** Marks the space read (`updateSpaceReadState`). */
export function MarkAsReadAction({ item, onMarked }: { item: SpaceItem; onMarked?: () => void }) {
  return (
    <Action
      title="Mark as Read"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Marking as read" });
        try {
          await markRead(item.space.name);
          toast.style = Toast.Style.Success;
          toast.title = `Marked ${item.title} as read`;
          onMarked?.();
        } catch (error) {
          await toast.hide();
          await showChatError(error);
        }
      }}
    />
  );
}

interface SpaceActionsProps {
  item: SpaceItem;
  onVisit?: () => void;
  onChange?: () => void;
  children?: JSX.Element | JSX.Element[] | null;
}

/** View Messages, Send Message, Open, Copy Link and Mark as Read for a space. */
export function SpaceActions({ item, onVisit, onChange, children }: SpaceActionsProps) {
  const url = spaceUrl(item.space);
  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section>
        <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} onPush={onVisit} />
        <SendMessageAction item={item} onSent={onVisit} />
        <OpenInChatAction url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <MarkAsReadAction item={item} onMarked={onChange} />
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
