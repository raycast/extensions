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

export type ResourceRecord = {
  type: string;
  name: string;
  ttl?: number;
  group: {
    type: "custom" | "product" | "personalNs";
  };
  value?: string;
  address?: string;
};

export type SuccessResult<T> = {
  items: T[];
  total: number;
};
export type ErrorResult = { detail: string; data?: Array<{ field: string; details: string }> };
