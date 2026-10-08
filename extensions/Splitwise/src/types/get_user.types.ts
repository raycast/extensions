export interface GetUser {
  user: User;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  registration_status: string;
  picture: Picture;
  notifications_read: Date;
  notifications_count: number;
  notifications: Notifications;
  default_currency: string;
  locale: string;
}

export interface Notifications {
  added_as_friend: boolean;
}

export interface Picture {
  small: string;
  medium: string;
  large: string;
}
