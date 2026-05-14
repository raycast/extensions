import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAranetData } from "swift:../../swift";

export function useAranetData({ macAddress }: ExtensionPreferences) {
  return usePromise(
    async (prefAddress: string) => {
      let targetAddress = prefAddress;

      if (!targetAddress) {
        const cached = await LocalStorage.getItem<string>("cached_device_uuid");
        if (cached) {
          targetAddress = cached;
        }
      }

      const result = await getAranetData(targetAddress || "");

      if (!prefAddress && result.deviceId) {
        await LocalStorage.setItem("cached_device_uuid", result.deviceId);
      }

      return result;
    },
    [macAddress || ""],
  );
}
