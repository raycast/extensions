import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import type { PveStorageContent, WithShowErrorScreen } from "@/types";
import { type PveFetchWithDataResult, usePveFetch } from "@/hooks/use-pve-fetch";

export const useStorageContent = (
  node: string,
  id: string,
): WithShowErrorScreen<PveFetchWithDataResult<PveStorageContent[]>> => {
  const [showErrorScreen, setShowErrorScreen] = useState<boolean>(false);

  const { data, ...rest } = usePveFetch<PveStorageContent[]>(`api2/json/nodes/${node}/storage/${id}/content`, {
    onError: (error) => {
      showFailureToast(error);
      setShowErrorScreen(true);
    },
    timerInterval: null,
  });

  const sortedData = data?.sort((a, b) => a.volid.localeCompare(b.volid)) ?? [];

  return {
    ...rest,
    data: sortedData,
    showErrorScreen,
  };
};
