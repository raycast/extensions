import { runShortcutSlot } from "./open-shortcut-slot";

export default async function Command() {
  await runShortcutSlot("slot3", "QuickURL #3");
}
