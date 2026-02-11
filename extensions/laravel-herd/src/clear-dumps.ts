import { showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Clearing Dumps...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.Dumps.clear(), "Failed to clear Dumps.");
}
