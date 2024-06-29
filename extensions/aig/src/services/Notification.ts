import {
  NotificationInterface,
  NotificationProviderInterface,
  NotificationSorter,
  NotificationFormatter,
  NotificationHandler,
  SlackProvider,
  EmailProvider,
} from "models/Notification";

class NotificationService {
  private sorter: NotificationSorter;
  private formatter: NotificationFormatter;
  private handler: NotificationHandler;
  private providers: NotificationProviderInterface[];

  constructor() {
    this.sorter = new NotificationSorter();
    this.formatter = new NotificationFormatter();
    this.handler = new NotificationHandler();
    this.providers = [new SlackProvider(), new EmailProvider()];
  }

  public async getAllNotifications(): Promise<NotificationInterface[]> {
    const allNotifications = await Promise.all(
      this.providers.map((provider) => provider.getNotifications()),
    );
    return allNotifications.flat();
  }

  public async getTitle(): Promise<string> {
    const notifications = await this.getAllNotifications();
    const sortedNotifications = this.sorter.sortByPriority(notifications);
    return this.formatter.formatTitle(sortedNotifications);
  }

  public async getIconColor(): Promise<string> {
    const notifications = await this.getAllNotifications();
    return this.formatter.getIconColor(notifications);
  }

  public async handleNotificationClick(
    notification: NotificationInterface,
  ): Promise<void> {
    await this.handler.handleClick(notification);
  }

  public async getNotificationsWithIcons(): Promise<NotificationInterface[]> {
    const notifications = await this.getAllNotifications();
    return this.sorter.sortByPriority(notifications);
  }
}

const notificationService = new NotificationService();
export default notificationService;
