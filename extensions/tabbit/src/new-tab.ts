import { Toast, showToast } from "@raycast/api";
import { openUrlInTabbit } from "./tabbit";

export default async function Command() {
  await openUrlInTabbit("https://web.tabbit-ai.com/newtab");

  await showToast({
    style: Toast.Style.Success,
    title: "Opened new Tabbit tab",
  });
}
