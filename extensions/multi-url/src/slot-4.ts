import { runShortcutSlot } from "./open-shortcut-slot";

export default async function Command() {
  await runShortcutSlot("slot4", "QuickURL #4");
}
