export enum DomainClientEPPStatus {
  clientDeleteProhibited = "clientDeleteProhibited",
  clientHold = "clientHold",
  clientRenewProhibited = "clientRenewProhibited",
  clientTransferProhibited = "clientTransferProhibited",
  clientUpdateProhibited = "clientUpdateProhibited",
}
export type DomainInfo = {
  name: string;
  unicodeName: string;
  isPremium: boolean;
  autoRenew: boolean;
  registrationDate: string;
  expirationDate: string;
  privacyProtection: {
    level: "public" | "high";
    contactForm: boolean;
  };
  eppStatuses: DomainClientEPPStatus[];
  nameservers: {
    provider: "basic" | "custom";
    hosts: string[];
  };
};

export type DomainAuthCode = {
  authCode: string;
  expires?: string | null;
};

export type ResourceRecord = {
  type: string;
  name: string;
  ttl?: number;
  group: {
    type: "custom" | "product" | "personalNs";
  };
  value?: string;
  address?: string;
  exchange?: string;
};

export type ResourceRecordsListCreateOrUpdateItem = (
  | {
      type: "TXT";
      value: string;
    }
  | {
      type: "MX";
      exchange: string;
      preference: number;
    }
  | {
      type: "A" | "AAAA";
      address: string;
    }
  | {
      type: "CNAME";
      cname: string;
    }
) & {
  name: string;
  ttl?: number;
};

export type SuccessResult<T> = {
  items: T[];
  total: number;
};
export type ErrorResult = { detail: string; data?: Array<{ field: string; details: string }> };
