import { getPreferenceValues as gp } from "@raycast/api";

export type Preference = {
  apiKey: string;
  show?: string;
  showTitle?: string;
};

function getPreferenceValues() {
  return gp<Preference>();
}

const preference: Preference = getPreferenceValues();

export default preference;
