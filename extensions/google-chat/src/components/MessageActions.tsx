import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { JSX } from "react";

import type { Message, Space } from "../api/types";
import type { UserNames } from "../helpers/chat-format";
import { chatToPlainText } from "../helpers/chat-format";
import { messageUrl } from "../helpers/links";
import { OpenInChatAction } from "./OpenInChatAction";
import { ReactionSubmenu } from "./ReactionSubmenu";
import { ReplyForm } from "./ReplyForm";

interface MessageActionsProps {
  message: Message;
  space: Space;
  spaceTitle: string;
  names?: UserNames;
  onChange?: () => void;
  /** Extra actions shown after Reply (e.g. Mark as Read). */
  children?: JSX.Element | JSX.Element[] | null;
}

/** Reply, react, copy and open actions for a message. */
export function MessageActions({ message, space, spaceTitle, names, onChange, children }: MessageActionsProps) {
  const link = messageUrl(space, message);
  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title="Reply in Thread"
          icon={Icon.Reply}
          target={<ReplyForm space={space} spaceTitle={spaceTitle} message={message} names={names} onSent={onChange} />}
        />
        <OpenInChatAction url={link} />
        {children}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ReactionSubmenu message={message} onReacted={onChange} />
        <Action.CopyToClipboard
          title="Copy Text"
          content={chatToPlainText(message.text, names)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard title="Copy Message Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyName} />
      </ActionPanel.Section>
    </>
  );
}
