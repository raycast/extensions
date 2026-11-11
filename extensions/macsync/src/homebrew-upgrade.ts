import { showHUD, showToast, Toast } from "@raycast/api";
import { failure, macsync } from "./run";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating with Homebrew…" });
  try {
    const lines = (await macsync("upgrade")).split("\n").filter((line) => line.trim());
    const summary = lines.find((line) => !line.endsWith("…")) ?? "Done";
    await toast.hide();
    await showHUD(`Homebrew: ${summary}`);
  } catch (e) {
    await toast.hide();
    await showHUD(failure(e));
  }
}
