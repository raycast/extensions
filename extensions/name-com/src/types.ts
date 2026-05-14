type Contact = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
};

export type Domain = {
  domainName: string;
  createDate: string;
  expireDate: string;
  autorenewEnabled: boolean;
  locked: boolean;
  contacts: {
    admin: Contact;
    billing: Contact;
    registrant: Contact;
    tech: Contact;
  };
  nameservers: string[];
  renewalPrice: number;
};

export type DNSRecord = {
  id: number;
  domainName: string;
  host: string;
  fqdn: string;
  type: "A" | "AAAA" | "ANAME" | "CNAME" | "MX" | "NS" | "SRV" | "TXT";
  answer: string;
  ttl: number;
  priority?: number;
};
