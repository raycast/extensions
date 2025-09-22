import { StatusResponse, AppError } from "../types";
import { getStatusConfig, statusService } from "../services";
import { useEffect, useState } from "react";

export interface UseStatusDataResult {
  status: StatusResponse | null;
  isLoading: boolean;
  appError: AppError | null;
  refresh: () => void;
}

export function useStatusData(): UseStatusDataResult {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState<AppError | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setAppError(null);

    const { config, error: configError } = getStatusConfig();

    if (configError) {
      setAppError(configError);
      setIsLoading(false);
      return;
    }

    if (!config) {
      setAppError({
        type: "preferences-validation",
        message: "Invalid configuration",
        instanceUrl: "",
      });
      setIsLoading(false);
      return;
    }

    const result = await statusService.getStatus(config);

    if (result.error) {
      setAppError(result.error);
    } else if (result.status) {
      setStatus(result.status);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    status,
    isLoading,
    appError,
    refresh,
  };
}

/**
 * Hook to get server units setting
 */
export function useServerUnits(): {
  units: "mg/dl" | "mmol" | null;
  isLoading: boolean;
  error: AppError | null;
} {
  const { status, isLoading, appError } = useStatusData();

  return {
    units: status?.settings.units || null,
    isLoading,
    error: appError,
  };
}
