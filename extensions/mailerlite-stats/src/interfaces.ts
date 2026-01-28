interface Subscriber {
  id: string;
  email: string;
  status: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
  source: string;
  sent: number;
  opens_count: number;
  clicks_count: number;
  open_rate: number;
  click_rate: number;
  ip_address: null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
  fields: {
    city: string | null;
    company: string | null;
    country: string | null;
    last_name: string;
    name: string;
    phone: string | null;
    state: string | null;
    z_i_p: string | null;
  };
  groups?: string[];
  opted_in_at: string | null;
  optin_ip: string | null;
}
export interface SubscriberListResponse {
  data: Subscriber[];
}
