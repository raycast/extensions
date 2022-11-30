import AWS from "aws-sdk";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  region: string;
  aws_profile: string;
}

export default function setupAws() {
  const preferences = getPreferenceValues<Preferences>();
  AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: preferences.aws_profile });
  AWS.config.update({ region: preferences.region });

  return preferences;
}
