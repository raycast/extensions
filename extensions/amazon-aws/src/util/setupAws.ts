import AWS from "aws-sdk";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  region: string;
}

export default function setupAws() {
  const preferences = getPreferenceValues<Preferences>();
  AWS.config.update({ region: preferences.region });

  return preferences;
}
