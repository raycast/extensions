import { useEffect } from "react";
import { useClient } from "./client";
import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export function useVaults() {
  const client = useClient();

  const { data, isLoading, error } = usePromise(async () => {
    const vaults = await client.getAllVaults();
    return vaults;
  });

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Error", error.message || "Something went wrong");
  }, [error]);

  return { vaults: data, isLoading, error };
}
