import { useCachedPromise } from "@raycast/utils";
import { getMyDevices } from "../api/getMyDevices";

type UseMyDevicesProps = {
  options?: {
    execute?: boolean;
  };
};

export function useMyDevices({ options }: UseMyDevicesProps = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getMyDevices(), [], {
    execute: options?.execute !== false,
  });

  return { myDevicesData: data, myDevicesError: error, myDevicesIsLoading: isLoading, myDevicesRevalidate: revalidate };
}
