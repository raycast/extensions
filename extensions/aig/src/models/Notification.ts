import { SourceType, NotificationType } from "types/notification";
import {
  NotificationSourceInterface,
  NotificationTypeInterface,
  NotificationInterface,
  NotificationProviderInterface,
} from "interfaces/notification";
import NotificationSorter from "utils/notification/Sorter";
import NotificationFormatter from "utils/notification/Formatter";
import NotificationHandler from "utils/notification/Handler";
import SlackProvider from "providers/Slack";
import EmailProvider from "providers/Email";

class NotificationModel {
  static typeDanger: NotificationTypeInterface = {
    label: "Danger",
    icon: "🚨",
  };
  static typeWarning: NotificationTypeInterface = {
    label: "Warning",
    icon: "⁉️",
  };
  static typeInfo: NotificationTypeInterface = { label: "Info", icon: "💡" };
  static typeSuccess: NotificationTypeInterface = {
    label: "Success",
    icon: "🎉",
  };
  static sourceSlack: NotificationSourceInterface = {
    label: "Slack",
    icon: "💬",
  };
  static sourceEmail: NotificationSourceInterface = {
    label: "Email",
    icon: "📬",
  };
}

export default NotificationModel;
export type {
  NotificationSourceInterface,
  NotificationTypeInterface,
  NotificationInterface,
  NotificationProviderInterface,
  SourceType,
  NotificationType,
};
export {
  NotificationSorter,
  NotificationFormatter,
  NotificationHandler,
  SlackProvider,
  EmailProvider,
};
