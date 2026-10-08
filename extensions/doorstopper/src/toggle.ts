import { showFailureToast } from "@raycast/utils";
import { isDoorstopperEnabled, startDoorstopper, stopDoorstopper } from "./util";

export default async function main() {
  try {
    if (isDoorstopperEnabled()) {
      await stopDoorstopper({ menubar: true, status: true }, "Doorstopper is now disabled");
    } else {
      await startDoorstopper({ menubar: true, status: true }, "Doorstopper is now enabled");
    }
  } catch (error) {
    showFailureToast("Failed to toggle Doorstopper", { message: String(error) });
  }
}
