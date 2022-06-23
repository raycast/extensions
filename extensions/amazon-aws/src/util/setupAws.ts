import AWS from "aws-sdk";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

export default function setupAws() {
  const preferences = getPreferenceValues<Preferences>();
  AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: preferences.aws_profile });
  AWS.config.update({ region: preferences.region });
}
