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
}

export type Domain = {
    domainName: string;
    locked: boolean;
    autorenewEnabled: boolean;
    expireDate: string;
    createDate: string;
}
export type DomainDetails = Domain & {
    nameservers: string[];
    registrant: Contact;
    admin: Contact;
    tech: Contact;
    billing: Contact;
    renewalPrice: number;
}

export type DNSRecord = {
    id: number;
    domainName: string;
    host?: string;
    fqdn: string;
    type: "A"| "AAAA"| "ANAME"| "CNAME"| "MX"| "NS"| "SRV" | "TXT";
    answer: string;
    ttl: number;
    priority?: number;
}