export type ListUserPackagesResponse = {
  [key: string]: {
    WEB_TEMPLATE: string;
    PROXY_TEMPLATE: string;
    DNS_TEMPLATE: string;
    WEB_DOMAINS: string;
    WEB_ALIASES: string;
    DNS_DOMAINS: string;
    DNS_RECORDS: string;
    MAIL_DOMAINS: string;
    MAIL_ACCOUNTS: string;
    DATABASES: string;
    CRON_JOBS: string;
    DISK_QUOTA: string;
    BANDWIDTH: string;
    NS: string;
    SHELL: string;
    BACKUPS: string;
    TIME: string;
    DATE: string;
  };
};
