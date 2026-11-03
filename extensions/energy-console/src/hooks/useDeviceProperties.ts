import { useCallback } from "react";
import { createEcoFlowService } from "../devices/runtime";
import { useAsyncValue } from "./useAsyncValue";

export function useDeviceProperties(identifier: string) {
  const load = useCallback(() => createEcoFlowService().getDeviceSnapshot(identifier), [identifier]);
  return useAsyncValue(load);
}
