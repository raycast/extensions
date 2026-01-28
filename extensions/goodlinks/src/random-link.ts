import { open } from "@raycast/api";
import { isApplicationInstalled, showMustBeInstalledToast } from "./utils/isApplicationInstalled";
import { randomLink } from "./utils/url-scheme";
import { showFailureToast } from "@raycast/utils";

export default async function openRandomLink() {
  const isInstalled = await isApplicationInstalled();
  if (!isInstalled) {
    await showMustBeInstalledToast();
    return;
  }

  try {
    await open(randomLink());
  } catch (error) {
    await showFailureToast(error);
  }
}
