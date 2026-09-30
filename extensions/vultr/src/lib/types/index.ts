export type ACL =
  | "manage_users"
  | "subscriptions_view"
  | "subscriptions"
  | "billing"
  | "support"
  | "provisioning"
  | "dns"
  | "abuse"
  | "upgrade"
  | "firewall"
  | "alerts"
  | "objstore"
  | "loadbalancer"
  | "vke"
  | "vcr";

export type Meta = {
  total: number;
  links: {
    next: string;
    prev: string;
  };
};

export type ErrorResponse = {
  error: string;
  status: number;
};
