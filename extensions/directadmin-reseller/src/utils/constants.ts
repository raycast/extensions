import { getPreferenceValues } from "@raycast/api";

export const RESELLER_USERNAME = getPreferenceValues<Preferences>().reseller_username;
export const RESELLER_PASSWORD = getPreferenceValues<Preferences>().reseller_password;
export const TOKEN = btoa(`${RESELLER_USERNAME}:${RESELLER_PASSWORD}`);

const DIRECTADMIN_URL = getPreferenceValues<Preferences>().directadmin_url;
export const API_URL = new URL(DIRECTADMIN_URL);

export const TITLES_FOR_KEYS = {
  account: "Account",
  additional_bandwidth: "Additional Bandwidth",
  aftp: "Anonymous FTP",
  api_with_password: "API w/ Password",
  bandwidth: "Bandwidth",
  bandwidth_limit: "Bandwidth Limit",
  bandwidth_used: "Bandwidth Used",
  catchall: "Catch All",
  cgi: "cgi-bin",
  cron: "Cron",
  db_quota: "Database Quota",
  disk_usage: "Disk Usage",
  dnscontrol: "DNS Control",
  domainptr: "Domain Pointers",
  email_deliveries: "Email Deliveries",
  email_deliveries_incoming: "Email Deliveries Incoming",
  email_deliveries_outgoing: "Email Deliveries Outgoing",
  email_quota: "Email Quota",
  ftp: "FTP",
  inode: "Inode",
  language: "Language",
  log_usage: "Log Usage",
  login_keys: "Login Keys",
  mysql: "MySQL",
  nemailf: "Email Forwarders",
  nemailml: "Email Mailing Lists",
  nemailr: "Email Autoresponders",
  nemails: "Email Accounts",
  ns1: "Nameserver 1",
  ns2: "Nameserver 2",
  nsubdomains: "Subdomains",
  other_quota: "Other Quota",
  php: "PHP",
  quota: "Quota",
  quota_without_system: "Quota Without System",
  skin: "Skin",
  spam: "Spam",
  ssh: "SSH",
  ssl: "SSL",
  subdomains: "Subdomains",
  suspend_at_limit: "suspend_at_limit",
  suspended: "Suspended",
  sysinfo: "sysinfo",
  user_type: "User Type",
  vdomains: "Virtual Domains",
};
