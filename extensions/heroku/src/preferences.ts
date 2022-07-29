import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export default () => {
  return getPreferenceValues<Preferences>();
};
