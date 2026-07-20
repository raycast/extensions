import { Cache as RaycastCache, Image, LocalStorage } from "@raycast/api";

import { Mailbox } from "../types";
import { MailIcon } from "./presets";
import { tryParseJson } from "./string";
import { Cache } from "./cache";

export const MAILBOXES = Object.freeze([
  "inbox",
  "important",
  "starred",
  "drafts",
  "other",
  "outbox",
  "junk",
  "trash",
  "archive",
] as const);

export type MailboxType = (typeof MAILBOXES)[number];

const MAILBOX_ICONS: Record<MailboxType, Image.ImageLike> = {
  inbox: MailIcon.Inbox,
  important: MailIcon.Important,
  starred: MailIcon.Starred,
  drafts: MailIcon.Drafts,
  outbox: MailIcon.Sent,
  junk: MailIcon.Junk,
  trash: MailIcon.Trash,
  archive: MailIcon.Archive,
  other: MailIcon.Mailbox,
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

const overrideCache = new RaycastCache();

LocalStorage.getItem<string>("mailbox-overrides").then((value) => {
  overrideCache.set("mailbox-overrides", value ?? "{}");
  overrideCache.subscribe((key, value) => {
    if (key !== "mailbox-overrides") return;
    LocalStorage.setItem(key, value ?? "{}");
  });
});

const getMailboxTypeOverride = (name: string): MailboxType | undefined => {
  const overrides = tryParseJson<Record<string, MailboxType>>(overrideCache.get("mailbox-overrides"), {});

  return overrides[name];
};

export const setMailboxTypeOverride = (name: string, type: MailboxType) => {
  const overrides = tryParseJson<Record<string, MailboxType>>(overrideCache.get("mailbox-overrides"), {});

  overrides[name] = type;

  overrideCache.set("mailbox-overrides", JSON.stringify(overrides));
  Cache.invalidateAccounts();
};

export const translateMailboxName = (name: string): MailboxType => {
  const override = getMailboxTypeOverride(name);
  if (override) return override;

  name = name.toLowerCase().trim();

  function includes(aliases: string[], name: string) {
    return aliases.includes(name);
  }

  if (includes(INBOX_ALIAS, name)) return "inbox";
  if (includes(IMPORTANT_ALIAS, name)) return "important";
  if (includes(STARRED_ALIAS, name)) return "starred";
  if (includes(DRAFTS_ALIAS, name)) return "drafts";
  if (includes(OUTBOX_ALIAS, name)) return "outbox";
  if (includes(JUNK_ALIAS, name)) return "junk";
  if (includes(TRASH_ALIAS, name)) return "trash";
  if (includes(ARCHIVE_ALIAS, name)) return "archive";

  return "other";
};

export const getMailboxType = translateMailboxName;

export const sortMailboxes = (a: Mailbox, b: Mailbox) => {
  const aIndex = MAILBOXES.indexOf(a.type);
  const bIndex = MAILBOXES.indexOf(b.type);

  return aIndex - bIndex;
};

export const getMailboxIcon = (type: MailboxType): Image.ImageLike => {
  return MAILBOX_ICONS[type] ?? MailIcon.Mailbox;
};

export const isInbox = (mailbox: Mailbox) => {
  return mailbox.type === "inbox";
};

export const isImportantMailbox = (mailbox: Mailbox) => {
  return mailbox.type === "important";
};

export const isArchiveMailbox = (mailbox: Mailbox) => {
  return mailbox.type === "archive";
};

export const isJunkMailbox = (mailbox: Mailbox) => {
  return mailbox.type === "junk";
};

export const isTrashMailbox = (mailbox: Mailbox) => {
  return mailbox.type === "trash";
};
