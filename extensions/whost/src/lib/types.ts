export type HostEntry = {
  ip: string;
  hostname: string;
  comment?: string;
};

export type Profile = {
  id: string;
  name: string;
  enabled: boolean;
  entries: HostEntry[];
};

export const HOSTS_PATH = "C:\\Windows\\System32\\drivers\\etc\\hosts";

export const MANAGED_START = "# === wHost managed start ===";
export const MANAGED_END = "# === wHost managed end ===";
