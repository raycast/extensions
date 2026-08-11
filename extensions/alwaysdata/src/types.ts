export type Domain = {
  id: number;
  name: string;
  date_expiration: number | null;
};

export enum DNSRecordType {
  A = "A",
  AAAA = "AAAA",
  ALIAS = "ALIAS",
  CAA = "CAA",
  CNAME = "CNAME",
  DS = "DS",
  MX = "MX",
  NS = "NS",
  PTR = "PTR",
  SOA = "SOA",
  SRV = "SRV",
  TXT = "TXT",
}
export type DNSRecord = {
  id: number;
  type: DNSRecordType;
  name: string;
  value: string;
  annotation: string;
};
export type DNSRecordForm = Omit<DNSRecord, "id" | "type"> & {
  type: string;
  domain: number;
};

export type Mailbox = {
  id: number;
  domain: {
    href: string;
  };
  name: string;
  annotation: string;
};

enum SiteType {
  apache_custom = "apache_custom",
  deno = "deno",
  dotnet = "dotnet",
  elixir = "elixir",
  java = "java",
  nodejs = "nodejs",
  php = "php",
  redirect = "redirect",
  reverse_proxy = "reverse_proxy",
  ruby_on_rails = "ruby_on_rails",
  ruby_rack = "ruby_rack",
  static = "static",
  user_program = "user_program",
  wsgi = "wsgi",
}
export type Site = {
  id: number;
  type: SiteType;
  addresses: [string, ...string[]];
};

export type Token = {
  id: number;
  app_name: string;
  key: string;
  is_disabled: boolean;
  allowed_ips: string | null;
};

export type ErrorResult =
  | string
  | {
      [field: string]: string[];
    };
