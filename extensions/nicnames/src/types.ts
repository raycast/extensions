enum Operation {
  NONE,
  CREATE,
  TRANSFER,
  RENEW,
  RESTORE,
  UPDATE,
}
type Price = {
  amt: number;
  ccy: number;
  op: Operation;
  period: {
    unit: "YEAR" | "MONTH";
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  };
};
export type DomainAvailability = {
  domainName: string;
  availableFor: Operation;
  tier: "REGULAR" | "PREMIUM" | "UNKNOWN";
  price: Price[];
};

export type OrderDomain = {
  type: "domain";
  domain: {
    name: string;
    registrant: string;
    admin: string;
    tech: string;
    billing: string;
    ns: string[];
  };
  oid: string;
  status: string[];
  cts: number;
  uts: number;
  ets: number;
};

export type Contact = {
  contactId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  org?: string;
  orgPhone?: string;
  cc: string;
  pc: string;
  sp: string;
  city: string;
  addr: string;
  email: string;
  phone: string;
  phonePolicy: boolean;
  fax?: string;
};
