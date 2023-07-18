import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  username: string;
  password: string;
  port?: number;
  bindAddress?: string;
}

export function getInkdropUrl() {
  const { username, password, port = 19840, bindAddress = "127.0.0.1" } = getPreferenceValues<Preferences>();
  return `http://${username}:${password}@${bindAddress}:${port}`;
}
