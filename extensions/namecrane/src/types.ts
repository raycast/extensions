export type Domain = {
  domain: string;
  status: "active" | "pending" | "pending_transfer";
  expiry_date: string;
  auto_renew: boolean;
  is_premium: boolean;
};

export type Record = {
  id: string;
  name: string;
  display_name: string;
  type: string;
  content: string;
  ttl: number;
};
