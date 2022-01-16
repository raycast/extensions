import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
}

export const generateEmail = () => {
  const preferences: Preferences = getPreferenceValues();
  const mailbox = Date.now();

  return `${mailbox}@${preferences.domain}`;
};
