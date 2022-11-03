import { showHUD, Clipboard } from "@raycast/api";
import { LayoutManager } from "./model/LayoutManager";

export default async function main() {
  const selectedInput = await LayoutManager.nextInput();
  await showHUD(`${selectedInput.title} selected`);
}
