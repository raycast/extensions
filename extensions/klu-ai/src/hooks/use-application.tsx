import { PersistedApp } from "@kluai/core";
import { environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export const useSelectedApplication = () => {
  const [selectedApp, setSelectedApp] = useCachedState<PersistedApp | undefined>(environment.extensionName, undefined);

  return { selectedApp, setSelectedApp };
};
