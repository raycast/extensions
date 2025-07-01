export interface APIQuota {
  quota: number;
  remaining: number;
  reset: string;
}

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

export enum TokenScopeType {
  EMAIL_FULL = "email_full",
  DOMAINS_FULL = "domains_full",
  ACTIVITY_READ = "activity_read",
  ACTIVITY_FULL = "activity_full",
  ANALYTICS_READ = "analytics_read",
  ANALYTICS_FULL = "analytics_full",
  TOKENS_FULL = "tokens_full",
  WEBHOOKS_FULL = "webhooks_full",
  TEMPLATES_FULL = "templates_full",
  SUPPRESSIONS_READ = "suppressions_read",
  SUPPRESSIONS_FULL = "suppressions_full",
  SMS_READ = "sms_read",
  SMS_FULL = "sms_full",
  EMAIL_VERIFICATION_READ = "email_verification_read",
  EMAIL_VERIFICATION_FULL = "email_verification_full",
  INBOUNDS_FULL = "inbounds_full",
  RECIPIENTS_READ = "recipients_read",
  RECIPIENTS_FULL = "recipients_full",
}
export interface Token {
  id: string;
  name: string;
  status: "pause" | "unpause";
  created_at: string;
  scopes: TokenScopeType[];
  domain: Pick<Domain, "id" | "name"> | null;
}
export interface ErrorResult {
  message: string;
  errors?: {
    [key: string]: string[];
  };
}
export interface Result<T> {
  data: T;
}
export interface PaginatedResult<T> {
  data: T[];
  links: {
    next: string | null;
  };
}
