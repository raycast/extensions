import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import type { PveServer, PveStorageStatus, WithShowErrorScreen } from "@/types";
import { type PveFetchResult, usePveFetch } from "@/hooks/use-pve-fetch";

export const useStorageStatus = (
  server: PveServer,
  node: string,
  id: string,
  options?: { execute?: boolean },
): WithShowErrorScreen<PveFetchResult<PveStorageStatus>> => {
  const [showErrorScreen, setShowErrorScreen] = useState<boolean>(false);

  const result = usePveFetch<PveStorageStatus>(server, `api2/json/nodes/${node}/storage/${id}/status`, {
    execute: options?.execute,
    onError: (error) => {
      showFailureToast(error);
      setShowErrorScreen(true);
    },
    timerInterval: 5000,
  });

  return {
    ...result,
    showErrorScreen,
  };
};
