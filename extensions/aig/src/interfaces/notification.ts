export interface NotificationSourceInterface {
  label: string;
  icon: string;
}

export interface NotificationTypeInterface {
  label: string;
  icon: string;
}

export interface NotificationInterface {
  title: string;
  description: string;
  type: NotificationTypeInterface;
  source: NotificationSourceInterface;
  timestamp: Date;
}

export interface NotificationProviderInterface {
  getNotifications(): Promise<NotificationInterface[]>;
}
