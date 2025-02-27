export type Item = {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};
export type Label = Omit<Item, "name"> & { label: string };

type AttachedLabel = {
  label_id: string;
  service_id: string;
};

export enum Term {
  Monthly = 1,
  Quarterly = 2,
  "Half Annual" = 3,
  Annual = 4,
  Biennal = 5,
  Triennial = 6,
}

export type Pricing = {
  id: number;
  service_id: string;
  service_type: number;
  active: number;
  currency: string;
  price: string;
  term: Term;
  as_usd: string;
  usd_per_month: string;
  next_due_date: string;
  created_at: string;
  updated_at: string;
};

type IP = {
  id: string;
  service_id: string;
  address: string;
  is_ipv4: 0 | 1;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
};

type CommonHosting = {
  id: string;
  active: number;
  main_domain: string;
  provider_id: number;
  location_id: number;
  bandwidth: number;
  disk: number;
  disk_type: "GB";
  disk_as_gb: number;
  domains_limit: number;
  subdomains_limit: number;
  ftp_limit: number;
  email_limit: number;
  db_limit: number;
  was_promo: number;
  owned_since: string;
  created_at: string;
  updated_at: string;
  location: Item;
  provider: Item;
  price: Pricing;
  ips: IP[];
  labels: AttachedLabel[];
};
export type HostingType =
  | "ApisCP"
  | "Centos"
  | "cPanel"
  | "Direct Admin"
  | "Webmin"
  | "Moss"
  | "Other"
  | "Plesk"
  | "Run cloud"
  | "Vesta CP"
  | "Virtual min";
export type Reseller = CommonHosting & {
  accounts: number;
  reseller_type: HostingType;
};
export type Shared = CommonHosting & {
  shared_type: HostingType;
};

export enum ServerType {
  KVM = 1,
  OVZ = 2,
  DEDI = 3,
  LXC = 4,
  "SEMI-DEDI" = 5,
  VMware = 6,
  NAT = 7,
}
export type Server = {
  id: string;
  active: 0 | 1;
  show_public: 0 | 1;
  hostname: string;
  ns1: string | null;
  ns2: string | null;
  server_type: ServerType;
  os_id: number;
  provider_id: number;
  location_id: number;
  ssh: number;
  bandwidth: number;
  ram: number;
  ram_type: "MB" | "GB";
  ram_as_mb: number;
  disk: number;
  disk_type: "GB" | "TB";
  disk_as_gb: number;
  cpu: number;
  has_yabs: 0 | 1;
  was_promo: 0 | 1;
  owned_since: string;
  created_at: string;
  updated_at: string;
  location: Item;
  provider: Item;
  os: Item;
  price: Pricing;
  ips: IP[];
  yabs: string[];
  labels: AttachedLabel[];
};

export type Domain = {
  id: string;
  domain: string;
  active: 0 | 1;
  extension: string;
  ns1: string | null;
  ns2: string | null;
  ns3: string | null;
  provider_id: number;
  owned_since: string;
  created_at: string;
  updated_at: string;
  provider: Item;
  price: Pricing;
  labels: AttachedLabel[];
};

export type Misc = Item & {
  active: 0 | 1;
  owned_since: string;
  price: Pricing;
};
