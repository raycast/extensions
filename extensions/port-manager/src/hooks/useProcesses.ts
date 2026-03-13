import { useCachedPromise } from "@raycast/utils";
import Process from "../models/Process";

export default function useProcesses() {
  const { data, revalidate, isLoading, mutate, error } = useCachedPromise(Process.getCurrent);

  return {
    processes: data,
    revalidateProcesses: revalidate,
    isLoadingProcesses: isLoading,
    mutateProcesses: mutate,
    processesError: error,
  };
}
