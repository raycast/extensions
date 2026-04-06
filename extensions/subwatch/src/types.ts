export interface Subscription {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  name: string;
  domain: string;
  price: number;
  currency: string;
  interval: string;
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  usage: number;
  category: string;
}

export type NewSubscription = {
  name: string;
  domain: string;
  price: string;
  currency: string;
  interval: string;
  start_date: Date | null;
  end_date?: Date | null;
};
