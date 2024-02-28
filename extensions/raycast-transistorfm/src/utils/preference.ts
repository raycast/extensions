import { getPreferenceValues as gp } from "@raycast/api";

export type Preference = {
  apiKey: string;
  show?: string;
  showTitle?: string;
};

export function getPreferenceValues() {
  return gp<Preference>();
}
