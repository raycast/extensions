import {
  getSlackReactionHtmlUrl,
  getSlackStarHtmlUrl,
  getSlackThreadHtmlUrl,
  SlackReaction,
  SlackStar,
  SlackThread,
} from "./integrations/slack/types";
import {
  getLinearIssueHtmlUrl,
  getLinearNotificationHtmlUrl,
  LinearIssue,
  LinearNotification,
} from "./integrations/linear/types";
import { getGoogleCalendarEventHtmlUrl, GoogleCalendarEvent } from "./integrations/google-calendar/types";
import { getGoogleDriveCommentHtmlUrl, GoogleDriveComment } from "./integrations/google-drive/types";
import { getGithubNotificationHtmlUrl, GithubNotification } from "./integrations/github/types";
import { getTickTickItemHtmlUrl, TickTickItem } from "./integrations/ticktick/types";
import { getWebPageHtmlUrl, WebPage } from "./integrations/api/types";
import { GoogleMailThread } from "./integrations/google-mail/types";
import { TodoistItem } from "./integrations/todoist/types";

export interface ThirdPartyItem {
  id: string;
  source_id: string;
  data: ThirdPartyItemData;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  integration_connection_id: string;
}

export type ThirdPartyItemData =
  | { type: "TodoistItem"; content: TodoistItem }
  | { type: "TickTickItem"; content: TickTickItem }
  | { type: "SlackStar"; content: SlackStar }
  | { type: "SlackReaction"; content: SlackReaction }
  | { type: "SlackThread"; content: SlackThread }
  | { type: "LinearIssue"; content: LinearIssue }
  | { type: "LinearNotification"; content: LinearNotification }
  | { type: "GithubNotification"; content: GithubNotification }
  | { type: "GoogleMailThread"; content: GoogleMailThread }
  | { type: "GoogleCalendarEvent"; content: GoogleCalendarEvent }
  | { type: "GoogleDriveComment"; content: GoogleDriveComment }
  | { type: "WebPage"; content: WebPage };

/** Human-readable label for the notification's source item type (e.g. "Linear Issue", "GitHub Pull Request"). */
export function getThirdPartyItemSourceLabel(thirdPartyItem: ThirdPartyItem): string {
  switch (thirdPartyItem.data.type) {
    case "TodoistItem":
      return "Todoist Task";
    case "TickTickItem":
      return "TickTick Task";
    case "SlackStar":
      return "Slack Star";
    case "SlackReaction":
      return "Slack Reaction";
    case "SlackThread":
      return "Slack Thread";
    case "LinearIssue":
      return "Linear Issue";
    case "LinearNotification":
      return thirdPartyItem.data.content.type === "ProjectNotification" ? "Linear Project" : "Linear Issue";
    case "GithubNotification": {
      switch (thirdPartyItem.data.content.item?.type) {
        case "GithubPullRequest":
          return "GitHub Pull Request";
        case "GithubDiscussion":
          return "GitHub Discussion";
        default:
          return "GitHub";
      }
    }
    case "GoogleMailThread":
      return "Google Mail";
    case "GoogleCalendarEvent":
      return "Google Calendar Event";
    case "GoogleDriveComment":
      return "Google Drive Comment";
    case "WebPage":
      return "Web Page";
  }
}

export function getThirdPartyItemHtmlUrl(thirdPartyItem: ThirdPartyItem): string {
  switch (thirdPartyItem.data.type) {
    case "TodoistItem":
      return `https://todoist.com/showTask?id=${thirdPartyItem.data.content.id}`;
    case "SlackStar":
      return getSlackStarHtmlUrl(thirdPartyItem.data.content);
    case "SlackReaction":
      return getSlackReactionHtmlUrl(thirdPartyItem.data.content);
    case "SlackThread":
      return getSlackThreadHtmlUrl(thirdPartyItem.data.content);
    case "LinearIssue":
      return getLinearIssueHtmlUrl(thirdPartyItem.data.content);
    case "LinearNotification":
      return getLinearNotificationHtmlUrl(thirdPartyItem.data.content);
    case "GithubNotification":
      return getGithubNotificationHtmlUrl(thirdPartyItem.data.content);
    case "GoogleMailThread":
      return `https://mail.google.com/mail/u/0/#inbox/${thirdPartyItem.data.content.id}`;
    case "TickTickItem":
      return getTickTickItemHtmlUrl(thirdPartyItem.data.content);
    case "GoogleCalendarEvent":
      return getGoogleCalendarEventHtmlUrl(thirdPartyItem.data.content);
    case "GoogleDriveComment":
      return getGoogleDriveCommentHtmlUrl(thirdPartyItem.data.content);
    case "WebPage":
      return getWebPageHtmlUrl(thirdPartyItem.data.content);
  }
}
