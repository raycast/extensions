import { Account, Status, VisibilityScope } from "./types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Icon } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import { MastodonError, Notification } from "../utils/types";
import { useMe } from "../hooks/useMe";

const nhm = new NodeHtmlMarkdown();

export const dateTimeFormatter = (time: Date, type: "short" | "long") => {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    day: "numeric",
    month: "long",
  };

  return type === "short"
    ? new Intl.DateTimeFormat("default", {
        ...options,
      }).format(time)
    : new Intl.DateTimeFormat("default", {
        ...options,
        weekday: "long",
        dayPeriod: "narrow",
      }).format(time);
};

export const statusParser = (
  { content, media_attachments, account, created_at, card }: Status,
  type: "id" | "date" | "idAndDate",
) => {
  const images = media_attachments.filter((attachment) => attachment.type === "gifv" || attachment.type === "image");
  const parsedImages = images.reduce(
    (link, image) =>
      link + `![${image.description ?? ""}](${image.preview_url || image.remote_url || image.preview_remote_url})`,
    "",
  );

  const date = new Date(created_at);
  const parsedTime = dateTimeFormatter(date, "short");

  const accountInfo = `**${account.display_name || account.username}** \`@${account.acct}\``;

  return (
    (type === "id" ? accountInfo : `\`${parsedTime}\``) +
    nhm.translate(`<br>${content}<br>`) +
    `${card ? `Link: [${card.title}](${card.url})` : ""}` +
    parsedImages
  );
};

export const contentExtractor = (html: string) => html.replace(/<.*?>/g, "");

export const errorHandler = (error: MastodonError | Error) => {
  const requestErr = error as MastodonError;
  return showToast(Toast.Style.Failure, "Error", requestErr.error || (error as Error).message);
};

/**
 * @source https://github.com/raycast/extensions/pull/5001/files#diff-a23f4b1af6a806e43e32f070b2f7ef858103f894395ce378fb2c1da4b9a2b2f1
 * @author BasixKOR
 */

const ICON_MAP: Record<VisibilityScope, Icon> = {
  public: Icon.Globe,
  unlisted: Icon.LockUnlocked,
  private: Icon.Lock,
  direct: Icon.AtSymbol,
};

const NAME_MAP: Record<VisibilityScope, string> = {
  public: "Public",
  unlisted: "Unlisted",
  private: "Followers-only",
  direct: "Mentioned people only",
};

export const getIconForVisibility = (visibility: VisibilityScope): Icon => ICON_MAP[visibility];

export const getNameForVisibility = (visibility: VisibilityScope) => NAME_MAP[visibility];

export const isVisiblityPrivate = (visibility: VisibilityScope) => visibility === "private" || visibility === "direct";

export const isMyStatus = (account: Account) => {
  const { username } = useMe();
  return username === account.acct;
};

export const groupNotifications = (notifications: Notification[]) => {
  const grouped: Partial<Record<Notification["type"], Notification[]>> = {};

  for (const notification of notifications) {
    if (grouped[notification.type]) {
      grouped[notification.type]?.push(notification);
    } else {
      grouped[notification.type] = [notification];
    }
  }

  return grouped;
};
