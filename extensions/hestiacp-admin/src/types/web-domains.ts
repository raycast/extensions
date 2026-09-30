export type ListWebDomainsResponse = {
  [key: string]: {
    IP: string;
    IP6: string;
    DOCUMENT_ROOT: string;
    U_DISK: string;
    U_BANDWIDTH: string;
    TPL: string;
    ALIAS: string;
    STATS: string;
    STATS_USER: string;
    SSL: "yes" | "no";
    SSL_HOME: string;
    LETSENCRYPT: "yes" | "no";
    FTP_USER: string;
    FTP_PATH: string;
    AUTH_USER: string;
    BACKEND: string;
    PROXY: string;
    PROXY_EXT: string;
    SUSPENDED: "yes" | "no";
    TIME: string;
    DATE: string;
  };
};
export type ListWebDomainAccesslogResponse = string[];
export type ListWebDomainErrorlogResponse = string[];
export type ListWebDomainSSLResponse = {
  [key: string]: {
    CRT: string;
    KEY: string;
    CA: string;
    SUBJECT: string;
    ALIASES: string;
    NOT_BEFORE: string;
    NOT_AFTER: string;
    SIGNATURE: string;
    PUB_KEY: string;
    ISSUER: string;
    SSL_FORCE: "yes" | "no";
  };
};
export type AddWebDomainRequest = {
  user: string;
  domain: string;
  ip: string;
  // restart: "yes" | "no";
  // aliases: string;
  // proxy_extensions:
};
export type AddWebDomainFormValues = AddWebDomainRequest;
