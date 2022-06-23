import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  prefix: string;
}

export const generateEmail = () => {
  const { domain, prefix } = getPreferenceValues<Preferences>();
  const mailbox = Date.now();

  return `${prefix}${mailbox}@${domain}`;
};
