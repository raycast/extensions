import { GlucoseEntry, AppError } from "../types";
import { glucoseService, getGlucoseConfig } from "../services";
import { useData } from "./useData";
import { GLUCOSE_CACHE_KEY } from "../constants";

export interface UseGlucoseDataResult {
  readings: GlucoseEntry[];
  isLoading: boolean;
  appError: AppError | null;
  refresh: () => void;
}

export function useGlucoseData(): UseGlucoseDataResult {
  const result = useData(glucoseService, getGlucoseConfig, GLUCOSE_CACHE_KEY, 10000);

  return {
    readings: result.data,
    isLoading: result.isLoading,
    appError: result.appError,
    refresh: result.refresh,
  };
}
