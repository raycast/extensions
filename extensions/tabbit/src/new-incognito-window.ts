import { Toast, showToast } from "@raycast/api";
import { openTabbit } from "./tabbit";

export default async function Command() {
  await openTabbit(["--incognito"]);

  await showToast({
    style: Toast.Style.Success,
    title: "Opened new incognito window",
  });
}
