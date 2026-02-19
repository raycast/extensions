import { usePromise } from "@raycast/utils";
import { BrowserExtension } from "@raycast/api";

export function useActiveTab() {
  const { data, isLoading } = usePromise(async () => {
    const tabs = await BrowserExtension.getTabs();
    return tabs.find((tab) => tab.active);
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
