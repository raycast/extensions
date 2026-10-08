export type NotificationResponse = NotificationSuccess | NotificationError;

interface NotificationSuccess {
  data: {
    status: string;
    id: string;
  };
}

export interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  subtitle?: string;
  badge?: string;
  sound?: boolean;
  ttl?: string;
  channelId?: string;
  data?: string;
  accessToken?: string;
}

interface NotificationError {
  error: string;
  error_description: string;
}
