import { useCachedPromise } from "@raycast/utils";
import { getHADevices } from "./utils";

export function useHADevices() {
  const { data, error, isLoading } = useCachedPromise(async () => {
    return await getHADevices();
  }, []);

  return { devices: data, error, isLoading };
}
