import { open } from "@raycast/api";
import { isApplicationInstalled, showMustBeInstalledToast } from "./utils/isApplicationInstalled";
import { randomLink } from "./utils/url-scheme";

export default async function command() {
  const isInstalled = await isApplicationInstalled();
  if (!isInstalled) {
    await showMustBeInstalledToast();
    return;
  }

  await open(randomLink());
}
