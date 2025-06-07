import { MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { isKeyboardLocked } from "./utils";

export default function Command() {
  const locked = isKeyboardLocked();

  if (!locked) {
    updateCommandMetadata({ subtitle: null });
    return null;
  }

  updateCommandMetadata({ subtitle: "🔒 Locked" });

  return (
    <MenuBarExtra icon="🔒" tooltip="Keyboard is locked">
      <MenuBarExtra.Item title="Keyboard is locked" />
    </MenuBarExtra>
  );
}
