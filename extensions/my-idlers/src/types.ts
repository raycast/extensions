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

export enum Currency {
  USD = "USD",
  AED = "AED",
  AFN = "AFN",
  ALL = "ALL",
  AMD = "AMD",
  ANG = "ANG",
  AOA = "AOA",
  ARS = "ARS",
  AUD = "AUD",
  AWG = "AWG",
  AZN = "AZN",
  BAM = "BAM",
  BBD = "BBD",
  BDT = "BDT",
  BGN = "BGN",
  BHD = "BHD",
  BIF = "BIF",
  BMD = "BMD",
  BND = "BND",
  BOB = "BOB",
  BRL = "BRL",
  BSD = "BSD",
  BTN = "BTN",
  BWP = "BWP",
  BYN = "BYN",
  BZD = "BZD",
  CAD = "CAD",
  CDF = "CDF",
  CHF = "CHF",
  CLP = "CLP",
  CNY = "CNY",
  COP = "COP",
  CRC = "CRC",
  CUP = "CUP",
  CVE = "CVE",
  CZK = "CZK",
  DJF = "DJF",
  DKK = "DKK",
  DOP = "DOP",
  DZD = "DZD",
  EGP = "EGP",
  ERN = "ERN",
  ETB = "ETB",
  EUR = "EUR",
  FJD = "FJD",
  FKP = "FKP",
  FOK = "FOK",
  GBP = "GBP",
  GEL = "GEL",
  GGP = "GGP",
  GHS = "GHS",
  GIP = "GIP",
  GMD = "GMD",
  GNF = "GNF",
  GTQ = "GTQ",
  GYD = "GYD",
  HKD = "HKD",
  HNL = "HNL",
  HRK = "HRK",
  HTG = "HTG",
  HUF = "HUF",
  IDR = "IDR",
  ILS = "ILS",
  IMP = "IMP",
  INR = "INR",
  IQD = "IQD",
  IRR = "IRR",
  ISK = "ISK",
  JEP = "JEP",
  JMD = "JMD",
  JOD = "JOD",
  JPY = "JPY",
  KES = "KES",
  KGS = "KGS",
  KHR = "KHR",
  KID = "KID",
  KMF = "KMF",
  KRW = "KRW",
  KWD = "KWD",
  KYD = "KYD",
  KZT = "KZT",
  LAK = "LAK",
  LBP = "LBP",
  LKR = "LKR",
  LRD = "LRD",
  LSL = "LSL",
  LYD = "LYD",
  MAD = "MAD",
  MDL = "MDL",
  MGA = "MGA",
  MKD = "MKD",
  MMK = "MMK",
  MNT = "MNT",
  MOP = "MOP",
  MRU = "MRU",
  MUR = "MUR",
  MVR = "MVR",
  MWK = "MWK",
  MXN = "MXN",
  MYR = "MYR",
  MZN = "MZN",
  NAD = "NAD",
  NGN = "NGN",
  NIO = "NIO",
  NOK = "NOK",
  NPR = "NPR",
  NZD = "NZD",
  OMR = "OMR",
  PAB = "PAB",
  PEN = "PEN",
  PGK = "PGK",
  PHP = "PHP",
  PKR = "PKR",
  PLN = "PLN",
  PYG = "PYG",
  QAR = "QAR",
  RON = "RON",
  RSD = "RSD",
  RUB = "RUB",
  RWF = "RWF",
  SAR = "SAR",
  SBD = "SBD",
  SCR = "SCR",
  SDG = "SDG",
  SEK = "SEK",
  SGD = "SGD",
  SHP = "SHP",
  SLE = "SLE",
  SLL = "SLL",
  SOS = "SOS",
  SRD = "SRD",
  SSP = "SSP",
  STN = "STN",
  SYP = "SYP",
  SZL = "SZL",
  THB = "THB",
  TJS = "TJS",
  TMT = "TMT",
  TND = "TND",
  TOP = "TOP",
  TRY = "TRY",
  TTD = "TTD",
  TVD = "TVD",
  TWD = "TWD",
  TZS = "TZS",
  UAH = "UAH",
  UGX = "UGX",
  UYU = "UYU",
  UZS = "UZS",
  VES = "VES",
  VND = "VND",
  VUV = "VUV",
  WST = "WST",
  XAF = "XAF",
  XCD = "XCD",
  XCG = "XCG",
  XDR = "XDR",
  XOF = "XOF",
  XPF = "XPF",
  YER = "YER",
  ZAR = "ZAR",
  ZMW = "ZMW",
  ZWL = "ZWL",
}

export type Pricing = {
  id: number;
  service_id: string;
  service_type: number;
  active: number;
  currency: Currency;
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

export type ErrorResponse =
  | {
      result: "fail";
      messages: {
        [key: string]: string[];
      };
    }
  | {
      message: string;
    };
