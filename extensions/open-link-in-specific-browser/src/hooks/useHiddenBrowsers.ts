import { useLocalStorage } from "@raycast/utils";

export const HIDDEN_BROWSERS_KEY = "hidden-browsers";

export function useHiddenBrowsers() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(HIDDEN_BROWSERS_KEY, []);
  const hiddenBundleIds = value ?? [];

  const hideBrowser = async (bundleId: string) => {
    if (!bundleId || hiddenBundleIds.includes(bundleId)) return;
    await setValue([...hiddenBundleIds, bundleId]);
  };

  const unhideBrowser = async (bundleId: string) => {
    if (!bundleId) return;
    await setValue(hiddenBundleIds.filter((id) => id !== bundleId));
  };

  const unhideAll = async () => {
    await setValue([]);
  };

  return { hiddenBundleIds, hideBrowser, unhideBrowser, unhideAll, isLoading };
}
