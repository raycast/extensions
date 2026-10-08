import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  effectiveShortcuts,
  loadShortcutConfig,
  serializeShortcuts,
  shortcutStorageKey,
  type ShortcutOverrides,
} from "../shortcuts";

export function useShortcuts(legacy?: string) {
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
        const config = loadShortcutConfig(raw, legacy);
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
              "快捷键配置读取或保存失败，已暂停自定义快捷键。请在快捷键设置中重试。",
          });
      }
    })();
    return () => {
      live = false;
    };
  }, [legacy]);
  const save = async (overrides: ShortcutOverrides) => {
    const serialized = serializeShortcuts(overrides);
    await LocalStorage.setItem(shortcutStorageKey, serialized);
    setState({ ready: true, overrides: JSON.parse(serialized).overrides });
  };
  const bindings: ShortcutOverrides =
    state.ready && !state.error ? effectiveShortcuts(state.overrides) : {};
  return { ...state, bindings, save };
}
