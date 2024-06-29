import NotificationModel, {
  NotificationInterface,
  NotificationProviderInterface,
} from "models/Notification";

export default class SlackProvider implements NotificationProviderInterface {
  async getNotifications(): Promise<NotificationInterface[]> {
    // temporary mock data
    return [
      {
        title: "New Slack from Boss",
        description: "Subject: Urgent - Project Deadline",
        type: NotificationModel.typeDanger,
        source: NotificationModel.sourceSlack,
        timestamp: new Date(),
      },
    ];
  }
}
