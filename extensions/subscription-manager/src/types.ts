export type BillingCycle = "monthly" | "yearly" | "weekly" | "quarterly" | "half-yearly";
export type SubscriptionStatus = "active" | "paused";

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  subscriptions: Subscription[];
}

export interface Subscription {
  id: string;
  name: string;
  billingDay: number;
  startDate: string; // "YYYY-MM-DD"
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: string;
  paymentMethod?: string;
  list: string;
  notes?: string;
  iconUrl?: string;
  color?: string;
  status: SubscriptionStatus;
}
