import { Application, getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";

interface Preferences {
  openWithApp: Application;
}

export function openApp() {
  const { openWithApp } = getPreferenceValues<Preferences>();
  console.log("openWithApp", openWithApp);
  execSync(`open -a ${openWithApp.name}`);
}
