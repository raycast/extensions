import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { toggleTrackChanges } from "./word";
export default async function Command() {
  try {
    const tracking = await toggleTrackChanges();
    await showHUD(`Word Track Changes ${tracking ? "on" : "off"}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not change Track Changes" });
  }
}
