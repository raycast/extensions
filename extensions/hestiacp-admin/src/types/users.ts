export type ListUsersResponse = {
  [key: string]: {
    NAME: string;
    PACKAGE: string;
    WEB_TEMPLATE: string;
    BACKEND_TEMPLATE: string;
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
    CONTACT: string;
    CRON_REPORTS: "yes" | "no";
    RKEY: string;
    ROLE: string;
    SUSPENDED: "yes" | "no";
    SUSPENDED_USERS: string;
    SUSPENDED_WEB: string;
    SUSPENDED_DNS: string;
    SUSPENDED_MAIL: string;
    SUSPENDED_DB: string;
    SUSPENDED_CRON: string;
    IP_AVAIL: string;
    IP_OWNED: string;
    U_USERS: string;
    U_DISK: string;
    U_DISK_DIRS: string;
    U_DISK_WEB: string;
    U_DISK_MAIL: string;
    U_DISK_DB: string;
    U_BANDWIDTH: string;
    U_WEB_DOMAINS: string;
    U_WEB_SSL: string;
    U_WEB_ALIASES: string;
    U_DNS_DOMAINS: string;
    U_DNS_RECORDS: string;
    U_MAIL_DOMAINS: string;
    U_MAIL_DKIM: string;
    U_MAIL_ACCOUNTS: string;
    U_DATABASES: string;
    U_CRON_JOBS: string;
    U_BACKUPS: string;
    LANGUAGE: string;
    TIME: string;
    DATE: string;
  };
};
export type ListUserStatsResponse = {
  [key: string]: {
    TIME: string;
    PACKAGE: string;
    IP_OWNED: string;
    DISK_QUOTA: string;
    U_DISK: string;
    U_DISK_DIRS: string;
    U_DISK_WEB: string;
    U_DISK_MAIL: string;
    U_DISK_DB: string;
    BANDWIDTH: string;
    U_BANDWIDTH: string;
    U_WEB_DOMAINS: string;
    U_WEB_SSL: string;
    U_WEB_ALIASES: string;
    U_DNS_DOMAINS: string;
    U_DNS_RECORDS: string;
    U_MAIL_DOMAINS: string;
    U_MAIL_DKIM: string;
    U_MAIL_ACCOUNTS: string;
    U_DATABASES: string;
    U_CRON_JOBS: string;
    U_BACKUPS: string;
  };
};
export type ListUserLogsResponse = {
  [key: string]: {
    DATE: string;
    TIME: string;
    LEVEL: string;
    CATEGORY: string;
    MESSAGE: string;
  };
};
export type ListUserAuthLogResponse = {
  [key: string]: {
    DATE: string;
    TIME: string;
    IP: string;
    ACTION: string;
    STATUS: "success" | "failed";
    USER_AGENT: string;
    SESSION: string;
    ACTIVE: "yes" | "no";
  };
};
export type ListUserNotificationsResponse = {
  [key: string]: {
    TOPIC: string;
    NOTICE: string;
    TYPE: string;
    ACK: "yes" | "no";
    TPL: string;
    TIME: string;
    DATE: string;
  };
};
export type ListUserBackupsResponse = {
  [key: string]: {
    TYPE: string;
    SIZE: string;
    WEB: string;
    DNS: string;
    MAIL: string;
    DB: string;
    CRON: string;
    UDIR: string;
    RUNTIME: string;
    TIME: string;
    DATE: string;
  };
};
export type AddUserRequest = {
  user: string;
  password: string;
  email: string;
  package: string;
  name: string;
  // lastname: string;
};
export type AddUserFormValues = AddUserRequest;
