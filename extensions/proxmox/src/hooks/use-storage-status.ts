import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import type { PveStorageStatus, WithShowErrorScreen } from "@/types";
import { type PveFetchResult, usePveFetch } from "@/hooks/use-pve-fetch";

export const useStorageStatus = (node: string, id: string): WithShowErrorScreen<PveFetchResult<PveStorageStatus>> => {
  const [showErrorScreen, setShowErrorScreen] = useState<boolean>(false);

  const result = usePveFetch<PveStorageStatus>(`api2/json/nodes/${node}/storage/${id}/status`, {
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
