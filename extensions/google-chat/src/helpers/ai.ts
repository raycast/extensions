/** Compact shapes the AI tools return. Pure: no Raycast imports. */

import type { Message, SpaceItem } from "../api/types";
import { chatToPlainText, mentionNames, type UserNames } from "./chat-format";
import { messageUrl, spaceUrl } from "./links";
import { senderName } from "./message-view";

const TYPE_LABEL = { dm: "DIRECT_MESSAGE", space: "SPACE", group: "GROUP_CHAT" } as const;

export function toolSpace(item: SpaceItem) {
  return {
    name: item.space.name,
    title: item.title,
    type: TYPE_LABEL[item.kind],
    email: item.email,
    lastActiveTime: item.space.lastActiveTime,
    url: spaceUrl(item.space),
  };
}

export function toolMessage(message: Message, item: SpaceItem | undefined, names: UserNames = {}) {
  const allNames = mentionNames(message, names);
  return {
    name: message.name,
    space: item?.title,
    sender: senderName(message, allNames),
    senderEmail: message.sender?.email,
    text: chatToPlainText(message.text, allNames),
    createTime: message.createTime,
    thread: message.thread?.name,
    isThreadReply: message.threadReply ?? false,
    attachments: message.attachment?.map((a) => a.contentName ?? "Attachment"),
    url: item ? messageUrl(item.space, message) : undefined,
  };
}

/** Clamps an optional limit to 1..max. */
export function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}
