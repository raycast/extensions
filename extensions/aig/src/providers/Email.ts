import NotificationModel, {
  NotificationInterface,
  NotificationProviderInterface,
} from "models/Notification";

export default class EmailProvider implements NotificationProviderInterface {
  async getNotifications(): Promise<NotificationInterface[]> {
    // temporary mock data
    return [
      {
        title: "New Email from Boss",
        description: "Subject: Urgent - Project Deadline",
        type: NotificationModel.typeDanger,
        source: NotificationModel.sourceEmail,
        timestamp: new Date(),
      },
    ];
  }
}
