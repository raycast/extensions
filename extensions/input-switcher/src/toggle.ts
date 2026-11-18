import { showHUD } from "@raycast/api";
import { LayoutManager } from "./model/LayoutManager";

export default async function main() {
  const selectedInput = await LayoutManager.setNextInput();
  await showHUD(`⌨️ Activated '${selectedInput.title}' Layout`);
}
