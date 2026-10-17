import { environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { PackageMap } from "../types/package";
import { debugPackages } from "../debugData";
import { useCallback } from "react";

export function usePackages() {
  const [packages, setPackages] = useCachedState<PackageMap>(
    "packages",
    environment.isDevelopment ? debugPackages : {},
  );

  const clearPackageCache = useCallback(
    (deliveryId: string) => {
      setPackages((prev) => {
        const updated = { ...prev };
        delete updated[deliveryId];
        return updated;
      });
    },
    [setPackages],
  );

  const clearAllPackageCaches = useCallback(
    (deliveryIds: string[]) => {
      setPackages((prev) => {
        const updated = { ...prev };
        deliveryIds.forEach((id) => delete updated[id]);
        return updated;
      });
    },
    [setPackages],
  );

  return {
    packages,
    setPackages,
    clearPackageCache,
    clearAllPackageCaches,
  };
}
