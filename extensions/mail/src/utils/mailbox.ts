import { Icon, Image } from "@raycast/api";
import { Mailbox } from "../types/types";
import { MailIcons } from "./presets";

export const getMailboxIcon = (name: string): Image.ImageLike => {
  name = name.toLowerCase();
  if (name.includes("mail")) return MailIcons.Envelope;
  if (name.includes("important")) return MailIcons.Important;
  if (name.includes("inbox")) return MailIcons.Inbox;
  if (name.includes("junk") || name.includes("spam")) return MailIcons.Junk;
  if (name.includes("recent") || name.includes("unread")) return MailIcons.Recent;
  if (name.includes("sent")) return MailIcons.Sent;
  if (name.includes("starred") || name.includes("flagged")) return Icon.Star;
  if (name.includes("trash")) return MailIcons.Trash;
  return MailIcons.Envelope;
};

export const isInbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("inbox");
};

export const isImportantMailbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("important");
};

export const isJunkMailbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("junk") || mailbox.name.toLowerCase().includes("spam");
};

export const isTrashMailbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("trash");
};
