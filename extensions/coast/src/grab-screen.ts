import { Clipboard, showHUD } from "@raycast/api";
import { grabCurrentScreen } from "./coast";

export default async function Command() {
  const capture = await grabCurrentScreen();
  await Clipboard.copy({ file: capture.image_path });
  await showHUD("Captured screen and copied image");
}
