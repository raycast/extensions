import { closeMainWindow, Toast, ToastStyle } from "@raycast/api";
import path from "path";
import loadPresetByIndex from "./utils/loadPresetByIndex";

export default async function main() {
  const index = parseInt(path.basename(__filename).replace("preset", "").replace(".js", "")) - 1;
  const toast = new Toast({
    style: ToastStyle.Animated,
    title: "Switching Display Settings...",
  });
  await toast.show();
  loadPresetByIndex(index);
  await closeMainWindow();
  await toast.hide();

  return null;
}
