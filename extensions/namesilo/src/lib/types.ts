export type Domain = {
  domain: string;
  created: string;
  expires: string;
  maxBid?: number;
};
type Nameserver = {
  nameserver: string;
  position: number;
};
export type DomainInfo = {
  created: string;
  expires: string;
  status: "Active" | "Inactive";
  locked: "Yes" | "No";
  private: "Yes" | "No";
  auto_renew: "Yes" | "No";
  traffic_type: string; //"Forwarded" | "Parked"
  email_verification_required: "Yes" | "No";
  portfolio: string;
  forward_url: string;
  forward_type: string;
  nameservers: Nameserver[];
  contact_ids: {
    registrant: string;
    administrative: string;
    technical: string;
    billing: string;
  };
};

export type DNSRecord = {
  record_id: string;
  type: string;
  host: string;
  value: string;
  ttl: string;
  distance: number;
};
export type AddDNSRecord = {
  rrtype: string;
  rrhost: string;
  rrvalue: string;
  rrdistance?: string;
  rrttl: string;
};

export type EmailForward = {
  email: string;
  forwards_to: string;
};
export type ConfigureEmailForward = {
  email: string;
  forward1: string;
};

export type WhoisInfo = {
  domain: string;
  registered: string;
  changed: string;
  created: string;
  expires: string;
  registrar: string;
};

export type Order = {
  order_number: string;
  order_date: string;
  method: string;
  total: string;
};
export type OrderDetails = {
  description: string;
  years_qty: string;
  price: string;
  subtotal: string;
  status: string;
  credited_date?: string;
  credited_amount?: string;
};

export type Price = {
  renew: string;
  registration: string;
  transfer: string;
};

export type AccountBalance = {
  balance: string;
};

export type AuctionStatus = 2 | 3 | 9 | 11 | 16;
export type Auction = {
  id: number;
  leaderUserId: number;
  ownerUserId: number;
  domainId: number;
  domain: string;
  statusId: AuctionStatus;
  typeId: 1 | 3;
  openingBid: number;
  currentBid: number;
  maxBid: number;
  // "bidId": null;
  domainCreatedOn: string;
  auctionEndsOn: string;
  url: string;
};
export type ViewAuction = Auction & {
  authKey: string;
  minBid: number;
  bidder: {
    userId: number;
    // bidId: null,
    userMaxBid: number;
    proxyMaxBid: number;
    balance: number;
    creditLimit: number;
    outstandingCommitments: number;
    renewPriceThisDomain: number;
    userInWatchlist: boolean;
  };
  paymentPlanMaxMonths: number;
  errors: Array<{
    code: number;
    message: string;
  }>;
  isValid: boolean;
  isPrivate: boolean;
  showReserve: boolean;
  reserve: number;
  bidsQuantity: number;
  visits: number;
  clicks: number;
  ctr: number;
};

type NameServerOptionalIPs = {
  ip2?: string;
  ip3?: string;
  ip4?: string;
  ip5?: string;
  ip6?: string;
  ip7?: string;
  ip8?: string;
  ip9?: string;
  ip10?: string;
  ip11?: string;
  ip12?: string;
  ip13?: string;
};
export type NameServer = {
  host: string;
  ip: string;
} & NameServerOptionalIPs;
export type AddNameServer = {
  new_host: string;
  ip1: string;
} & NameServerOptionalIPs;
export type ChangeNameServer = {
  ns1: string;
  ns2: string;
  ns3?: string;
  ns4?: string;
  ns5?: string;
  ns6?: string;
  ns7?: string;
  ns8?: string;
  ns9?: string;
  ns10?: string;
  ns11?: string;
  ns12?: string;
  ns13?: string;
};

export type Contact = {
  contact_id: string;
  default_profile: string;
  nickname: string;
  company: string;
  first_name: string;
  last_name: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
  fax: string;
};

type BaseResponse = {
  request: {
    operation: string;
    ip: string;
  };
};
export type EmptySuccessResponse = {
  reply: {
    code: 300;
    detail: "success";
  };
};
export type MessageSuccessResponse = BaseResponse &
  EmptySuccessResponse & {
    message: string;
  };
export type SuccessResponse<T> = BaseResponse & {
  reply: {
    code: 300;
    detail: "success";
  } & T;
  pager?: {
    page: number;
    pageSize: number;
    total: number;
  };
};
export type ErrorResponse = BaseResponse & {
  reply: {
    code: Exclude<number, 300> | null;
    detail: Exclude<string, "success"> | null;
  };
};
export type ArrOrObjOrNull<T> = T[] | T | null;
