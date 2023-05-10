import { Icon, Image } from "@raycast/api";
import { Mailbox } from "../types";
import { MailIcons } from "./presets";

export const getMailboxIcon = (name: string): Image.ImageLike => {
  name = name.toLowerCase();

  if (name.includes("important")) return MailIcons.Important;
  if (name.includes("inbox")) return MailIcons.Inbox;
  if (name.includes("junk") || name.includes("spam")) return MailIcons.Junk;
  if (name.includes("recent") || name.includes("unread")) return MailIcons.Recent;
  if (name.includes("sent")) return MailIcons.Sent;
  if (name.includes("starred") || name.includes("flagged")) return Icon.Star;
  if (name.includes("trash") || name.includes("bin")) return MailIcons.Trash;
  if (name.includes("mail")) return MailIcons.Envelope;

  return MailIcons.Envelope;
};

export const isInbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("inbox");
};

export const isImportantMailbox = (mailbox: Mailbox) => {
  return mailbox.name.toLowerCase().includes("important");
};

export const isJunkMailbox = (mailbox: Mailbox) => {
  return ["junk", "spam"].includes(mailbox.name.toLowerCase());
};

export const isTrashMailbox = (mailbox: Mailbox) => {
  return ["trash", "bin"].includes(mailbox.name.toLowerCase());
};
