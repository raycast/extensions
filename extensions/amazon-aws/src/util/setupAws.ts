import AWS from "aws-sdk";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

export default function setupAws() {
  const preferences: Preferences = getPreferenceValues();
  const credentials = new AWS.SharedIniFileCredentials({profile: preferences.aws_profile});
  AWS.config.credentials = credentials;
  AWS.config.update({  region: preferences.region });
}
