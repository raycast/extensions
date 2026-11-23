import { Color, environment, Image } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/// Spark's own icons, bundled in assets/spark. Most are drawn in currentColor
/// and need a tint - an untinted one would be black in the dark theme; the
/// few with their own colors (Google Meet, Zoom, attendee badges, search
/// tips) are shown as they are.
export type SparkIconName =
  | "AcceptSender"
  | "AddNewEvent"
  | "Attachment"
  | "BlockSender"
  | "Calendar"
  | "CalendarInvitation"
  | "CalendarMeetWith"
  | "Checkmark"
  | "Clock"
  | "Comment"
  | "Composer"
  | "Done"
  | "Draft"
  | "Envelope"
  | "EnvelopeSparkle"
  | "ErrorGeneral"
  | "Folder"
  | "Forward"
  | "GoogleMeet"
  | "GroupEmails"
  | "InboxSectionNewsletters"
  | "InboxSectionNotifications"
  | "InboxSectionPeople"
  | "InviteAccept"
  | "InviteDecline"
  | "InviteMaybe"
  | "InviteParticipantAccepted"
  | "InviteParticipantAcceptedSmall"
  | "InviteParticipantDeclined"
  | "InviteParticipantDeclinedSmall"
  | "InviteParticipantNoResponse"
  | "InviteParticipantNoResponseSmall"
  | "InviteParticipantOrganizer"
  | "InviteParticipantOrganizerSmall"
  | "InviteParticipantPossible"
  | "InviteParticipantPossibleSmall"
  | "Label"
  | "Location"
  | "MarkRead1"
  | "MarkUnread"
  | "MeetingNotes"
  | "Notifications"
  | "Person"
  | "PersonCircleAdd"
  | "Pin"
  | "Priority"
  | "PriorityCrossed"
  | "PrioritySender"
  | "Reply"
  | "ReplyAll"
  | "Search"
  | "Settings"
  | "SettingsLayoutFullScreen"
  | "SettingsLayoutSplitView"
  | "SettingsNotificationsMute"
  | "SidebarFetchMessages"
  | "Snooze"
  | "SystemFolderArchive"
  | "SystemFolderBlocked"
  | "SystemFolderDraft"
  | "SystemFolderInbox"
  | "SystemFolderPin"
  | "SystemFolderSend"
  | "SystemFolderSnooze"
  | "SystemFolderSpam"
  | "SystemFolderTrash"
  | "Trash"
  | "UnGroupEmails"
  | "UnreadDot"
  | "UpdateApp"
  | "Zoom";

export function sparkIcon(name: SparkIconName, tintColor?: Color.ColorLike): Image.ImageLike {
  const source = `spark/${name}.svg`;
  return tintColor ? { source, tintColor } : { source };
}

/// A Spark icon for an action menu or empty view, tinted like Raycast's own.
export function actionIcon(name: SparkIconName): Image.ImageLike {
  return sparkIcon(name, Color.PrimaryText);
}

/// The Spark app icon, for actions that open Spark.
export const SPARK_APP_ICON: Image.ImageLike = { source: "icon.png" };

const EMPTY_VIEW_ICON_SIZE = 80;
let emptyViewIcon: Image.ImageLike | undefined;

/// The app icon for an empty view. Raycast draws an empty view's image at the
/// size it declares, up to about 240 pt - the icon file itself is 512 px and
/// would fill that - so it's wrapped in an SVG of a smaller size.
export function sparkAppIconForEmptyView(): Image.ImageLike {
  if (emptyViewIcon) return emptyViewIcon;
  try {
    const png = readFileSync(join(environment.assetsPath, "icon.png")).toString("base64");
    const size = EMPTY_VIEW_ICON_SIZE;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<image width="${size}" height="${size}" href="data:image/png;base64,${png}"/></svg>`;
    emptyViewIcon = { source: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` };
  } catch {
    emptyViewIcon = SPARK_APP_ICON;
  }
  return emptyViewIcon;
}

/// The video call's own icon when Spark has one for the service.
export function conferenceIcon(url: string | undefined): Image.ImageLike {
  if (url && /(^|\.)meet\.google\.com$/i.test(hostOf(url))) return sparkIcon("GoogleMeet");
  if (url && /(^|\.)zoom\.us$/i.test(hostOf(url))) return sparkIcon("Zoom");
  return sparkIcon("CalendarMeetWith", Color.Blue);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/// A bundled icon's SVG markup, for drawing it into a generated image.
export function sparkIconSVG(name: string): string | undefined {
  try {
    return readFileSync(join(environment.assetsPath, "spark", `${name}.svg`), "utf8");
  } catch {
    return undefined;
  }
}
