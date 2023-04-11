import { App, Shortcut, formatHotkey } from "../utils";
import { $_SM_getShortcuts, $_SM_setShortcuts } from "../assets/mixins";
import { useState } from "react";
import { ShortcutForm } from "../components/shortcut-form";

interface EditShortcutProps {
  app: App;
  shortcut: Shortcut;
}

export function EditShortcut(props: EditShortcutProps) {
  const { app, shortcut } = props;

  const [uuid] = useState<string>(shortcut.uuid);
  const [command] = useState<string>(shortcut.command);
  const [when] = useState<string>(shortcut.when);
  const [hotkey] = useState<string[]>(shortcut.hotkey);

  async function saveShortcut(shortcut: Shortcut, source: string) {
    const filteredShortcuts = (await $_SM_getShortcuts(app.source)).filter((el: Shortcut) => el.uuid !== uuid);
    formatHotkey(shortcut.hotkey);

    if (app.source === source) {
      filteredShortcuts.push(shortcut);
      await $_SM_setShortcuts(app.source, filteredShortcuts);
    } else {
      await $_SM_setShortcuts(app.source, filteredShortcuts);
      const shortcuts = await $_SM_getShortcuts(source);
      shortcuts.push(shortcut);
      await $_SM_setShortcuts(source, shortcuts);
    }
  }

  return <ShortcutForm shortcut={{ uuid, command, when, hotkey }} saveShortcut={saveShortcut} source={app.source} />;
}
