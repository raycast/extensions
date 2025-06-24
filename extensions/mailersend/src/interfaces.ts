export interface Domain {
  id: string;
  name: string;
  is_verified: boolean;
  domain_stats: {
    total: number;
    queued: number;
    sent: number;
    rejected: number;
    delivered: number;
  };
}

export interface User {
  id: string;
  avatar: string | null;
  email: string;
  last_name: string;
  name: string;
  "2fa": boolean;
  role: string;
}

export enum ActivityEventType {
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  SOFT_BOUNCED = "soft_bounced",
  HARD_BOUNCED = "hard_bounced",
  OPENED = "opened",
  CLICKED = "clicked",
  UNSUBSCRIBED = "unsubscribed",
  SPAM_COMPLAINTS = "spam_complaints",
}
export interface Activity {
  id: string;
  created_at: string;
  type: ActivityEventType;
  email: {
    subject: string;
    recipient: {
      email: string;
    };
  };
}
export interface Template {
  id: string;
  name: string;
  image_path: string;
}
export interface ErrorResult {
  message: string;
  errors?: {
    [key: string]: string[];
  };
}
export interface PaginatedResult<T> {
  data: T[];
  links: {
    next: string | null;
  };
}
