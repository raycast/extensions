export type DomainVerificationKey = {
  key: string;
  record: {
    type: "TXT";
    name: string;
    value: "domain-verified";
  };
  description: string;
};

export enum CatchAllType {
  Reject = "fail",
  DiscardSilently = "blackhole",
  Forward = "address",
}
export type CatchAll = {
  type: CatchAllType;
  address: string | null;
  description: string;
};

export type DNSInfo = {
  mx_records: Array<{
    priority: number;
    hostname: string;
    description: string;
  }>;
  spf: {
    type: string;
    name: string;
    value: string;
  };
  dkim: {
    type: string;
    name: string;
    value: string;
  } | null;
  verification: {
    type: string;
    name: string;
    value: string;
    description: string;
  } | null;
};

export type Domain = {
  domain: string;
  mail_hosting: boolean;
  ssl_enabled: boolean;
  pointers: string[];
};

export type CreateEmailAccountRequest = {
  username: string;
  password: string;
  quota: number;
  limit: number;
};
export type EmailAccount = {
  username: string;
  email: string;
  quota: number;
  usage: number;
  limit: number;
  sent: number;
  suspended: boolean;
};

export type CreateEmailForwarderRequest = {
  alias: string;
  destinations: string[];
};
export type EmailForwarder = {
  alias: string;
  email: string;
  destinations: string[];
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
};
export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    field: string;
    message: string;
  };
};
