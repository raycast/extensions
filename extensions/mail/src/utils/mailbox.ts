import { Image } from "@raycast/api";

import { Mailbox } from "../types";
import { MailIcon } from "./presets";

const MAILBOXES = ["inbox", "important", "starred", "drafts", "outbox", "junk", "trash", "archive"] as const;

const MAILBOX_ICONS: Record<string, Image.ImageLike> = {
  inbox: MailIcon.Inbox,
  important: MailIcon.Important,
  starred: MailIcon.Starred,
  drafts: MailIcon.Drafts,
  outbox: MailIcon.Sent,
  junk: MailIcon.Junk,
  trash: MailIcon.Trash,
  archive: MailIcon.Archive,
};

const INBOX_ALIAS = [
  // english
  "inbox",
  // chinese
  "收件箱",
  // russian
  "входящие",
];

const IMPORTANT_ALIAS = [
  // english
  "important",
  // chinese
  "重要",
  "重要邮件",
  // russian
  "важные",
];

const STARRED_ALIAS = [
  // english
  "starred",
  "flagged",
  // chinese
  "星标",
  "星标邮件",
  "已加星标",
  // russian
  "избранное",
];

const DRAFTS_ALIAS = [
  // english
  "drafts",
  // chinese
  "草稿",
  "草稿箱",
  // russian
  "черновики",
];

const OUTBOX_ALIAS = [
  // english
  "outbox",
  "sent",
  "sent items",
  "sent mail",
  "sent messages",
  // chinese
  "已发送",
  "发件箱",
  "已发邮件",
  // russian
  "отправленные",
];

const JUNK_ALIAS = [
  // english
  "junk",
  "spam",
  "junk email",
  // chinese
  "垃圾邮件",
  // russian
  "спам",
  "нежелательная почта",
];

const TRASH_ALIAS = [
  // english
  "trash",
  "bin",
  "deleted items",
  "deleted mail",
  "deleted messages",
  // chinese
  "废纸篓",
  "垃圾箱",
  "回收站",
  "已删除",
  "已删除邮件",
  // russian
  "корзина",
  "удаленные",
];

const ARCHIVE_ALIAS = [
  // english
  "archive",
  "[gmail]", // gmail archive
  // chinese
  "归档",
  "存档",
  // russian
  "архив",
  "вся почта",
];

export const translateMailboxName = (name: string): string => {
  name = name.toLowerCase();

  if (INBOX_ALIAS.includes(name)) return "inbox";
  if (IMPORTANT_ALIAS.includes(name)) return "important";
  if (STARRED_ALIAS.includes(name)) return "starred";
  if (DRAFTS_ALIAS.includes(name)) return "drafts";
  if (OUTBOX_ALIAS.includes(name)) return "outbox";
  if (JUNK_ALIAS.includes(name)) return "junk";
  if (TRASH_ALIAS.includes(name)) return "trash";
  if (ARCHIVE_ALIAS.includes(name)) return "archive";

  return name;
};

export const sortMailboxes = (a: Mailbox, b: Mailbox) => {
  const aName = translateMailboxName(a.name);
  const bName = translateMailboxName(b.name);

  const aIndex = MAILBOXES.findIndex((mailbox) => mailbox === aName);
  const bIndex = MAILBOXES.findIndex((mailbox) => mailbox === bName);

  return (aIndex - bIndex) * (aIndex === -1 || bIndex === -1 ? -1 : 1);
};

export const getMailboxIcon = (name: string): Image.ImageLike => {
  return MAILBOX_ICONS[translateMailboxName(name)] ?? MailIcon.Mailbox;
};

export const isInbox = (mailbox: Mailbox) => {
  return INBOX_ALIAS.includes(mailbox.name.toLowerCase());
};

export const isImportantMailbox = (mailbox: Mailbox) => {
  return IMPORTANT_ALIAS.includes(mailbox.name.toLowerCase());
};

export const isArchiveMailbox = (mailbox: Mailbox) => {
  return ARCHIVE_ALIAS.includes(mailbox.name.toLowerCase());
};

export const isJunkMailbox = (mailbox: Mailbox) => {
  return JUNK_ALIAS.includes(mailbox.name.toLowerCase());
};

export const isTrashMailbox = (mailbox: Mailbox) => {
  return TRASH_ALIAS.includes(mailbox.name.toLowerCase());
};
