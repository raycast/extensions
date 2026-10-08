export type Domain = {
  domain_group_name: string;
  domain_group: string;
  domain: string;
  type: string;
  port: number;
  active: boolean;
  last_event: string;
  created_at: string;
  domain_to: string;
  type_to: string;
  port_to: number;
  tunnel_url: string | null;
  tunnel_active: boolean;
  tunnel_paused: boolean;
  tunnel_provider: string | null;
};

export type DomainGroup = {
  id: string;
  name: string;
  domains: Domain[];
};
