import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  prefix: string;
}

export const generateEmail = () => {
  const { domain, prefix } = getPreferenceValues<Preferences>();
  const mailbox = Date.now();

  if (!prefix) {
    return `${mailbox}@${domain}`;
  }

  return `${prefix}${mailbox}@${domain}`;
};
