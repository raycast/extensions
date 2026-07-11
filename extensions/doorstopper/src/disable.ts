import { showFailureToast } from "@raycast/utils";
import { stopDoorstopper } from "./util";

export default async function main() {
  try {
    await stopDoorstopper({ menubar: true, status: false }, "Doorstopper is now disabled");
  } catch (error) {
    showFailureToast("Failed to disable Doorstopper", { message: String(error) });
  }
}
