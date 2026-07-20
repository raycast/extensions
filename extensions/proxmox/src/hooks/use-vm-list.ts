import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import type { OmitData, PveVm, WithShowErrorScreen } from "@/types";
import { type PveFetchResult, usePveFetch } from "@/hooks/use-pve-fetch";
import { getMockPveVmData } from "@/utils/mock";

const useVmListInternal = (enabled = true): WithShowErrorScreen<PveFetchResult<PveVm[]>> => {
  const [showErrorScreen, setShowErrorScreen] = useState<boolean>(false);
  const url = "api2/json/cluster/resources";
  const search = new URLSearchParams({
    type: "vm",
  });

  const result = usePveFetch<PveVm[]>(`${url}?${search.toString()}`, {
    execute: enabled,
    onError: (error) => {
      showFailureToast(error);
      setShowErrorScreen(true);
    },
  });

  return {
    ...result,
    showErrorScreen,
  };
};

/**
 * Hook to get the list of VMs
 *
 * @param mock - If true, use mock data instead of fetching from the API
 */
export const useVmList = (
  mock = false,
): OmitData<ReturnType<typeof useVmListInternal>> & { setType: (type: string) => void; data: PveVm[] } => {
  const [type, setType] = useState<string>("all");

  const { data, ...rest } = useVmListInternal(!mock);
  const filteredData =
    (mock ? getMockPveVmData() : data)?.filter((vm) => (type === "all" ? true : vm.type === type)) ?? [];

  return {
    ...rest,
    data: filteredData,
    setType,
  };
};
