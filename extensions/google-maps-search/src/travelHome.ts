import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { Preferences } from "./utils/types";
import { makeDirectionsURL } from "./utils/url";

export default async () => {
  const preferences: Preferences = getPreferenceValues();
  const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
  await closeMainWindow();
  // Single quotes sanitze input.
  exec(`/usr/bin/open '${dirURL}'`);
};
