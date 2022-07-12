import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { Preferences, makeDirectionsURL } from "./utils";
import { exec } from "child_process";

export default async () => {
  const preferences: Preferences = getPreferenceValues();
  const dirURL = makeDirectionsURL("", preferences.homeAddress, preferences.preferredMode);
  await closeMainWindow();
  // Single quotes sanitze input.
  exec(`/usr/bin/open '${dirURL}'`);
};
