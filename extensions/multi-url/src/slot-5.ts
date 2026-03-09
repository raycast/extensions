import { runShortcutSlot } from "./open-shortcut-slot";

export default async function Command() {
  await runShortcutSlot("slot5", "QuickURL #5");
}
