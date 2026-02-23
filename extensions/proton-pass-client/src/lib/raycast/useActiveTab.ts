import { usePromise } from "@raycast/utils";
import { BrowserExtension, environment } from "@raycast/api";

export function useActiveTab() {
  const { data, isLoading } = usePromise(async () => {
    if (!environment.canAccess(BrowserExtension)) return undefined;

    try {
      const tabs = await BrowserExtension.getTabs();
      return tabs.find((tab) => tab.active);
    } catch {
      return undefined;
    }
  });

  return { activeTab: data, activeOrigin: originOf(data?.url), isLoading };
}

export function originOf(raw?: string) {
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}
