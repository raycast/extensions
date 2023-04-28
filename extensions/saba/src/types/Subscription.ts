export enum SubscriptionStatus {
  MISSING = "MISSING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  PENDING = "PENDING",
}

export interface Subscription {
  status: SubscriptionStatus;
  username: string;
  token: string;
}
