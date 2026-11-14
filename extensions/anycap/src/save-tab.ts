import { showHUD } from "@raycast/api";
import { frontTab } from "./browser";
import { save } from "./anycap";

export default async function main() {
  try {
    const tab = await frontTab();
    await showHUD(await save({ url: tab.url, title: tab.title }));
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
