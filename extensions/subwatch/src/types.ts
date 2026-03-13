interface Billing {
  count: number;
  price: number;
  end_date: string | null;
  interval: string;
  start_date: string;
}

interface Item {
  name: string;
  count: number;
  domain: string;
  billing: Billing[];
}

export interface GetSubscriptionsResponse {
  id: string;
  data: Item[];
  premium: boolean;
}

export type NewSubscription = {
  service: string;
  domain: string;
  price: string;
  interval: string;
  start_date: Date;
  end_date: Date;
};
