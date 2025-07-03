export type ListMailDomainsResponse = {
  [key: string]: {
    ANTIVIRUS: "yes" | "no";
    ANTISPAM: "yes" | "no";
    REJECT: "yes" | "no";
    RATE_LIMIT: string;
    DKIM: "yes" | "no";
    CATCHALL: string;
    ACCOUNTS: string;
    U_DISK: string;
    SSL: "yes" | "no";
    SUSPENDED: "yes" | "no";
    TIME: string;
    DATE: string;
    WEBMAIL_ALIAS: string;
    WEBMAIL: string;
  };
};
export type AddMailDomainRequest = {
  user: string;
  domain: string;
};
export type AddMailDomainFormValues = AddMailDomainRequest;
