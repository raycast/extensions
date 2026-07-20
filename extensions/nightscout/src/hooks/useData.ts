import { useState, useEffect, useCallback, useRef } from "react";
import { AppError } from "../types";
import { BaseDataService } from "../services/baseDataService";
import { handleAppError } from "../utils/errorHandling";

export interface UseDataResult<T> {
  data: T[];
  isLoading: boolean;
  appError: AppError | null;
  refresh: () => void;
}

export interface DataServiceConfig {
  instance: string;
  token?: string;
}

export function useData<T>(
  service: BaseDataService<T>,
  getConfig: () => DataServiceConfig,
  dataTypeName: string,
  refreshInterval: number = 30000,
): UseDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appError, setAppError] = useState<AppError | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState<boolean>(false);
  const currentDataRef = useRef<T[]>([]);
  const errorCountRef = useRef<number>(0);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      // prevent excessive retries when there are persistent errors
      if (!forceRefresh && appError && errorCountRef.current >= 3) {
        console.log(`Stopping automatic retries for ${dataTypeName} after ${errorCountRef.current} consecutive errors`);
        return;
      }

      if (!hasInitiallyLoaded || forceRefresh) {
        setIsLoading(true);
      }

      // clear previous error when starting a manual refresh
      if (appError !== null && forceRefresh) {
        setAppError(null);
        errorCountRef.current = 0;
      }

      try {
        const config = getConfig();
        const result = await service.getData(config, forceRefresh);

        // only update state if data has actually changed
        if (JSON.stringify(result.data) !== JSON.stringify(currentDataRef.current)) {
          setData(result.data);
          currentDataRef.current = result.data;
        }

        if (result.error) {
          setAppError(result.error);
          errorCountRef.current++;
          await handleAppError(result.error, dataTypeName);
        } else {
          // clear any previous errors if the request was successful
          if (appError !== null) {
            setAppError(null);
          }
          errorCountRef.current = 0;
        }

        if (!hasInitiallyLoaded) {
          setHasInitiallyLoaded(true);
        }
      } catch (error) {
        console.error(`Failed to load ${dataTypeName}:`, error);
        setAppError(error as AppError);
        errorCountRef.current++;
      } finally {
        if (isLoading) {
          setIsLoading(false);
        }
      }
    },
    [hasInitiallyLoaded, service, getConfig, dataTypeName],
  );

  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // initial load and cache subscription
  useEffect(() => {
    const cachedData = service.getCached();
    if (cachedData.length > 0) {
      setData(cachedData);
    }

    // refresh if needed
    if (service.isCacheStale() || cachedData.length === 0) {
      loadData();
    } else {
      setHasInitiallyLoaded(true);
      setIsLoading(false);
    }
  }, [loadData, service]);

  // auto-refresh if not loading and no errors, and haven't hit error limit
  useEffect(() => {
    if (!hasInitiallyLoaded || isLoading || appError || errorCountRef.current >= 3) {
      return;
    }

    const intervalId = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [hasInitiallyLoaded, isLoading, appError, loadData, refreshInterval]);

  return {
    data,
    isLoading,
    appError,
    refresh,
  };
}
