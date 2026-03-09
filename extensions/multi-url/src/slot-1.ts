import { runShortcutSlot } from "./open-shortcut-slot";

export default async function Command() {
  await runShortcutSlot("slot1", "QuickURL #1");
}
