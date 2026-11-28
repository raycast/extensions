import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  effectiveShortcuts,
  loadShortcutConfig,
  serializeShortcuts,
  shortcutStorageKey,
  type ShortcutOverrides,
} from "../shortcuts";

export function useShortcuts() {
  const [state, setState] = useState<{
    ready: boolean;
    overrides: ShortcutOverrides;
    error?: string;
  }>({ ready: false, overrides: {} });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(shortcutStorageKey);
        const config = loadShortcutConfig(raw);
        if (config.needsSave)
          await LocalStorage.setItem(
            shortcutStorageKey,
            serializeShortcuts(config.overrides),
          );
        if (live)
          setState({
            ready: true,
            overrides: config.overrides,
            error: config.error,
          });
      } catch {
        if (live)
          setState({
            ready: true,
            overrides: {},
            error:
              "Could not read or save shortcut settings. Custom shortcuts are disabled. Try again in Shortcut Settings.",
          });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const save = async (overrides: ShortcutOverrides) => {
    const serialized = serializeShortcuts(overrides);
    await LocalStorage.setItem(shortcutStorageKey, serialized);
    setState({ ready: true, overrides: JSON.parse(serialized).overrides });
  };
  const bindings: ShortcutOverrides =
    state.ready && !state.error ? effectiveShortcuts(state.overrides) : {};
  return { ...state, bindings, save };
}
