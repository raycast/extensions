import { showFailureToast } from "@raycast/utils";
import { startDoorstopper } from "./util";

export default async function main() {
  try {
    await startDoorstopper({ menubar: true, status: true }, "Doorstopper is now enabled");
  } catch (error) {
    showFailureToast("Failed to disable Doorstopper", { message: String(error) });
  }
}
