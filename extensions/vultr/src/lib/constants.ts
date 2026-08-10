import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://api.vultr.com/v2/";
const API_PAT = getPreferenceValues<Preferences>().personal_access_token;
export const API_HEADERS = {
  Authorization: `Bearer ${API_PAT}`,
  "Content-Type": "application/json",
};

export const ACLs = {
  abuse: "Receive AUP/ToS Notifications",
  alerts: "Receive Maintenance Notifications",
  billing: "Manage Billing",
  dns: "Manage DNS",
  firewall: "Manage Firewall",
  loadbalancer: "Manage Load Balancers",
  manage_users: "Manage Users",
  objstore: "Manage Object Storage",
  provisioning: "Deploy New Servers",
  subscriptions: "Manage Servers",
  subscriptions_view: "View Servers",
  support: "Create Support Tickets",
  upgrade: "Upgrade Existing Servers",
  vke: "Manage Vultr Kubernetes Engines",
};

export const VULTR_ICON = "vultr.png";
const VULTR_DASH = "https://my.vultr.com/";
export const VULTR_LINKS = {
  bandwidthUsage: VULTR_DASH + "billing/#bandwidthusage",
  settingsprofile: VULTR_DASH + "settings/#settingsprofile",
};
