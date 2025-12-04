import { usePromise, showFailureToast } from "@raycast/utils";
import { useEffect } from "react";
import { createINPIApiService } from "./inpi-api-mock";
import { CompanyData } from "../types";

interface UseCompanyDataResult {
  data: CompanyData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook that automatically uses the appropriate API service based on context:
 * - Production/Development: Real INPI API with Raycast preferences
 * - Tests with credentials: Real INPI API
 * - Tests without credentials: Mocked API service
 */
export function useCompanyData(siren: string): UseCompanyDataResult {
  const { data, isLoading, error } = usePromise(
    async (siren: string) => {
      const apiService = await createINPIApiService();
      return apiService.getCompanyInfo(siren);
    },
    [siren],
  );

  useEffect(() => {
    if (error) {
      showFailureToast(error, { title: "Search Error" });
    }
  }, [error]);

  return { data, isLoading, error };
}
