import { runShortcutSlot } from "./open-shortcut-slot";

export default async function Command() {
  await runShortcutSlot("slot2", "QuickURL #2");
}
