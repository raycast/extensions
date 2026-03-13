import { getPreferenceValues } from "@raycast/api";
import IPinfoWrapper, { IPinfoLiteWrapper } from "node-ipinfo";

interface Preferences {
  apiToken: string;
}

const getLiteClient = () => {
  const { apiToken } = getPreferenceValues<Preferences>();

  if (!apiToken) {
    throw new Error("API token is required. Please set it in the preferences.");
  }

  return new IPinfoLiteWrapper(apiToken);
};

const getClient = () => {
  const { apiToken } = getPreferenceValues<Preferences>();

  if (!apiToken) {
    throw new Error("API token is required. Please set it in the preferences.");
  }

  return new IPinfoWrapper(apiToken);
};

export const getMyIPInfo = () => getLiteClient().lookupIp();
export const getIpInfo = (ip: string) => getClient().lookupIp(ip);
