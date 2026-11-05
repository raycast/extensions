import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ComponentType } from "react";
import { loadSettings } from "./lib/prefs";

// Settings load async; hold rendering until ready.
export function withSettings<P extends object>(Command: ComponentType<P>) {
  return function WithSettings(props: P) {
    const { isLoading } = usePromise(loadSettings);
    return isLoading ? <List isLoading /> : <Command {...props} />;
  };
}
