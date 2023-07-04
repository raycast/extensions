import { Color, Icon, Image, environment } from "@raycast/api";

import { OutgoingMessageAction } from "../types";

const UnreadColor = environment.appearance === "dark" ? "#0983ff" : "#007aff";
const ReadColor = environment.appearance === "dark" ? "#a7a7a7" : "#757575";

const _mainIcon = {
  Envelope: { source: "../assets/icons/envelope.svg", tintColor: Color.PrimaryText },
  Important: { source: "../assets/icons/flagged.svg", tintColor: Color.PrimaryText },
  Inbox: { source: "../assets/icons/inbox.svg", tintColor: Color.PrimaryText },
  Junk: { source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText },
  MailApp: { source: "../assets/icons/mail.png" },
  Read: { source: Icon.CheckCircle, tintColor: ReadColor },
  Recent: { source: "../assets/icons/recent.svg", tintColor: Color.PrimaryText },
  Save: { source: "../assets/icons/save.png", tintColor: Color.PrimaryText },
  SaveAs: { source: "../assets/icons/save-as.png", tintColor: Color.PrimaryText },
  Sent: { source: "../assets/icons/sent.svg", tintColor: Color.PrimaryText },
  Trash: { source: "../assets/icons/trash.svg", tintColor: Color.PrimaryText },
  TrashRed: { source: "../assets/icons/trash.svg", tintColor: Color.Red },
  Unread: { source: Icon.CircleProgress100, tintColor: UnreadColor },
  Drafts: { source: Icon.Document, tintColor: Color.PrimaryText },
  Archive: { source: "../assets/icons/archive.svg", tintColor: Color.PrimaryText },
  Mailbox: { source: "../assets/icons/folder.svg", tintColor: Color.PrimaryText },
  Starred: { source: Icon.Star, tintColor: Color.PrimaryText },
};

export const MailIcon: Record<keyof typeof _mainIcon, Image.ImageLike> = _mainIcon;

export const OutgoingMessageIcon: Record<OutgoingMessageAction, Image.ImageLike> = {
  [OutgoingMessageAction.New]: MailIcon.Sent,
  [OutgoingMessageAction.Reply]: Icon.Reply,
  [OutgoingMessageAction.ReplyAll]: Icon.Reply,
  [OutgoingMessageAction.Forward]: Icon.ArrowUpCircle,
  [OutgoingMessageAction.Redirect]: Icon.ArrowRightCircle,
};
