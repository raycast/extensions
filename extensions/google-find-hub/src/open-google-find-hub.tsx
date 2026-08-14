import { open, showHUD } from "@raycast/api";

const FIND_HUB_URL = "https://android.com/find";

export default async function Command() {
  try {
    await open(FIND_HUB_URL);
  } catch (error) {
    console.error(error);
    await showHUD("Could not open Google Find Hub");
  }
}
