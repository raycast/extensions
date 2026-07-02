import { Toast, showToast } from "@raycast/api";
import { openTabbit } from "./tabbit";

export default async function Command() {
  await openTabbit(["--new-window", "https://web.tabbit-ai.com/newtab"]);

  await showToast({
    style: Toast.Style.Success,
    title: "Opened new Tabbit window",
  });
}
