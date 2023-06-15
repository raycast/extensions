import { Icon, Image } from "@raycast/api";

import { Mailbox } from "../types";
import { MailIcon } from "./presets";

export const getMailboxIcon = (name: string): Image.ImageLike => {
  name = name.toLowerCase();

  if (name.includes("important")) return MailIcon.Important;
  if (name.includes("inbox")) return MailIcon.Inbox;
  if (name.includes("junk") || name.includes("spam")) return MailIcon.Junk;
  if (name.includes("recent") || name.includes("unread")) return MailIcon.Recent;
  if (name.includes("sent")) return MailIcon.Sent;
  if (name.includes("starred") || name.includes("flagged")) return Icon.Star;
  if (name.includes("trash") || name.includes("bin")) return MailIcon.Trash;
  if (name.includes("mail")) return MailIcon.Envelope;

  return MailIcon.Envelope;
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
