import { Color, Icon, Image, environment } from "@raycast/api";
import { Mailbox } from "../types/types";

const UnreadColor = environment.theme === "dark" ? "#0983ff" : "#007aff";
const ReadColor = environment.theme === "dark" ? "#a7a7a7" : "#757575";

export const MailIcons: { [key: string]: Image.ImageLike } = {
  Envelope: { source: "../assets/icons/envelope.svg", tintColor: Color.PrimaryText },
  Important: { source: "../assets/icons/important.svg", tintColor: Color.PrimaryText },
  Inbox: { source: "../assets/icons/inbox.svg", tintColor: Color.PrimaryText },
  Junk: { source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText },
  Read: { source: Icon.CheckCircle, tintColor: ReadColor },
  Recent: { source: "../assets/icons/recent.svg", tintColor: Color.PrimaryText },
  Save: { source: "../assets/icons/save.png", tintColor: Color.PrimaryText },
  Sent: { source: "../assets/icons/sent.svg", tintColor: Color.PrimaryText },
  Trash: { source: "../assets/icons/trash.svg", tintColor: Color.PrimaryText },
  Unread: { source: Icon.CircleProgress100, tintColor: UnreadColor },
};

export const Mailboxes: { [key: string]: Mailbox } = {
  all: {
    title: "All Mail",
    mailbox: "All Mail",
    icon: MailIcons.Envelope,
  },
  recent: {
    title: "Recent Mail",
    mailbox: "All Mail",
    icon: MailIcons.Recent,
  },
  inbox: {
    title: "Inbox",
    mailbox: "Inbox",
    icon: MailIcons.Inbox,
  },
  important: {
    title: "Important Mail",
    mailbox: "Important",
    icon: MailIcons.Important,
  },
  starred: {
    title: "Starred Mail",
    mailbox: "Starred",
    icon: Icon.Star,
  },
  sent: {
    title: "Sent Mail",
    mailbox: "Sent Mail",
    icon: MailIcons.Sent,
  },
  junk: {
    title: "Junk Mail",
    mailbox: "Spam",
    icon: MailIcons.Junk,
  },
  trash: {
    title: "Trash",
    mailbox: "Trash",
    icon: MailIcons.Trash,
  },
};
