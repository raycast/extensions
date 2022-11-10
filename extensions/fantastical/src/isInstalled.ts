import { getApplications } from "@raycast/api";

export async function isInstalled() {
  return (await getApplications()).find((app) => app.name === "Fantastical") != undefined ? true : false;
}
