import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION } from "../consts";

export const useMigrationManager = () => {
  const [isMigrationNeeded, setIsMigrationNeeded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (isMigrationNeeded === undefined) {
      LocalStorage.getItem(STORAGE_VERSION_KEY).then((storageVersion) => {
        if (storageVersion !== undefined && storageVersion !== CURRENT_STORAGE_VERSION) {
          setIsMigrationNeeded(true);
        } else {
          setIsMigrationNeeded(false);
        }
      });
    }
  }, []);

  return isMigrationNeeded;
};
