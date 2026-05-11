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
import { getGithubNotificationHtmlUrl, GithubNotification } from "./integrations/github/types";
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
  | { type: "SlackStar"; content: SlackStar }
  | { type: "SlackReaction"; content: SlackReaction }
  | { type: "SlackThread"; content: SlackThread }
  | { type: "LinearIssue"; content: LinearIssue }
  | { type: "LinearNotification"; content: LinearNotification }
  | { type: "GithubNotification"; content: GithubNotification }
  | { type: "GoogleMailThread"; content: GoogleMailThread };

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
  }
}
