import { Color, Icon, Image, environment } from "@raycast/api";
import { Mailbox } from "../types/types";

export const Mailboxes: { [key: string]: Mailbox } = {
  all: {
    title: "All Mail",
    mailbox: "All Mail",
    icon: { source: "../assets/icons/envelope.svg", tintColor: Color.PrimaryText },
  },
  recent: {
    title: "Recent Mail",
    mailbox: "All Mail",
    icon: { source: "../assets/icons/recent.svg", tintColor: Color.PrimaryText },
  },
  inbox: {
    title: "Inbox",
    mailbox: "Inbox",
    icon: { source: "../assets/icons/inbox.svg", tintColor: Color.PrimaryText },
  },
  important: {
    title: "Important Mail",
    mailbox: "Important",
    icon: { source: "../assets/icons/important.svg", tintColor: Color.PrimaryText },
  },
  starred: {
    title: "Starred Mail",
    mailbox: "Starred",
    icon: Icon.Star,
  },
  sent: {
    title: "Sent Mail",
    mailbox: "Sent Mail",
    icon: { source: "../assets/icons/sent.svg", tintColor: Color.PrimaryText },
  },
  junk: {
    title: "Junk Mail",
    mailbox: "Spam",
    icon: { source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText },
  },
  trash: {
    title: "Trash",
    mailbox: "Trash",
    icon: { source: "../assets/icons/trash.svg", tintColor: Color.PrimaryText },
  },
};

const UnreadColor = environment.theme === "dark" ? "#0983ff" : "#007aff";
const ReadColor = environment.theme === "dark" ? "#a7a7a7" : "#757575";

export const MailIcons: { [key: string]: Image.ImageLike } = {
  Unread: { source: Icon.CircleProgress100, tintColor: UnreadColor },
  Read: { source: Icon.CheckCircle, tintColor: ReadColor },
};
