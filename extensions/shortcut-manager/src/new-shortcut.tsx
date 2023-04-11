import { Shortcut, formatHotkey, ShortcutDefault } from "./utils";
import { $_SM_getShortcuts, $_SM_initializeState, $_SM_setShortcuts } from "./assets/mixins";
import { useEffect } from "react";
import { ShortcutForm } from "./components/shortcut-form";

interface NewShortcutProps {
  source?: string;
}

export default function NewShortcut(props: NewShortcutProps) {
  async function saveShortcut(shortcut: Shortcut, source: string) {
    const shortcuts = await $_SM_getShortcuts(source);
    formatHotkey(shortcut.hotkey);
    shortcuts.push(shortcut);
    await $_SM_setShortcuts(source, shortcuts);
  }

  useEffect(() => {
    const init = async () => {
      await $_SM_initializeState();
    };

    init();
  }, []);

  return (
    <ShortcutForm shortcut={ShortcutDefault()} saveShortcut={saveShortcut} source={props?.source ? props.source : ""} />
  );
}
