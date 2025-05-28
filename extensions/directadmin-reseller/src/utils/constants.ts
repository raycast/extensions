import { getPreferenceValues } from "@raycast/api";

export const RESELLER_USERNAME = getPreferenceValues<Preferences>().reseller_username;
export const RESELLER_PASSWORD = getPreferenceValues<Preferences>().reseller_password;
export const RESELLER_API_TOKEN = btoa(`${RESELLER_USERNAME}:${RESELLER_PASSWORD}`);

export const DIRECTADMIN_URL = getPreferenceValues<Preferences>().directadmin_url;
export const API_URL = new URL(DIRECTADMIN_URL) + "CMD_API_";

export const TITLES_FOR_KEYS = {
  aftp: "Anonymous FTP",
  catchall: "Catch All",
  cgi: "cgi-bin",
  clamav: "ClamAV",
  db_quota: "Database Quota",
  dnscontrol: "DNS Control",
  docsroot: "Document Root",
  domainptr: "Domain Pointers",
  ftp: "FTP",
  ip: "IP",
  ips: "IPs",
  lastquotaupdate: "Last Quota Update",
  mysql: "MySQL",
  nemailf: "Email Forwarders",
  nemailml: "Email Mailing Lists",
  nemailr: "Email Autoresponders",
  nemails: "Email Accounts",
  ns1: "Nameserver 1",
  ns2: "Nameserver 2",
  nsubdomains: "Subdomains",
  php: "PHP",
  ssh: "SSH",
  ssl: "SSL",
  sysinfo: "SysInfo",
  usertype: "User Type",
  vdomains: "Virtual Domains",
  wordpress: "WordPress",
};
