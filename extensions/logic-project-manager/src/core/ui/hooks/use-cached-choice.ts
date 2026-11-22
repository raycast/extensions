import { useEffect, useRef, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { readCachedChoice, viewPrefs } from "@/core/ui/shared/view-prefs";

// 旧版本把同一个设置存在 LocalStorage 里时传进来：第一次读到时搬进 Cache，用户已选的值不丢。
// parse 用来还原旧格式（useLocalStorage 存的是 JSON，纯字符串要 JSON.parse）。
export type LegacyChoice = { key: string; parse?: (raw: string) => string };

// 读取/持久化一个记住的选项。同步读 Cache，首帧就是记住的值，不会先画默认值再跳。
export function useCachedChoice<T extends string>(
  storageKey: string,
  isValid: (value: string) => value is T,
  fallback: T,
  legacy?: LegacyChoice,
) {
  const [value, setValue] = useState<T>(() => readCachedChoice(storageKey, isValid, fallback));
  // 迁移只做一次：isValid 每次渲染都是新函数，靠这个标记避免重复读 LocalStorage。
  const migratedRef = useRef(false);

  useEffect(() => {
    if (migratedRef.current || legacy === undefined || viewPrefs.get(storageKey) !== undefined) return;
    migratedRef.current = true;
    void LocalStorage.getItem<string>(legacy.key).then((raw) => {
      if (raw === undefined) return;
      const stored = legacy.parse ? legacy.parse(raw) : raw;
      if (!isValid(stored)) return;
      viewPrefs.set(storageKey, stored);
      setValue(stored);
    });
  }, [storageKey, legacy, isValid]);

  const set = (next: T) => {
    setValue(next);
    viewPrefs.set(storageKey, next);
  };

  return [value, set] as const;
}
