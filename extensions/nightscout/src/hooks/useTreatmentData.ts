import { Treatment, AppError } from "../types";
import { treatmentService, getTreatmentConfig } from "../services/treatmentService";
import { useData } from "./useData";
import { TREATMENTS_CACHE_KEY } from "../constants";

export interface UseTreatmentDataResult {
  treatments: Treatment[];
  isLoading: boolean;
  appError: AppError | null;
  refresh: () => void;
}

export function useTreatmentData(): UseTreatmentDataResult {
  const result = useData(treatmentService, getTreatmentConfig, TREATMENTS_CACHE_KEY, 45000); // 45 seconds

  return {
    treatments: result.data,
    isLoading: result.isLoading,
    appError: result.appError,
    refresh: result.refresh,
  };
}
