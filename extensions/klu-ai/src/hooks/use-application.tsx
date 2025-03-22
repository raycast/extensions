import { PersistedApp } from "@kluai/core";
import { environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";

export const useSelectedApplication = () => {
  const [selectedApp, setSelectedApp] = useCachedState<PersistedApp | undefined>(
    `${environment.extensionName}-selected-app`,
    undefined,
  );

  return useMemo(() => ({ selectedApp, setSelectedApp }), [selectedApp, setSelectedApp]);
};
