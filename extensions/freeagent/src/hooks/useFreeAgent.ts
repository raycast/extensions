import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { getAccessToken, showFailureToast } from "@raycast/utils";
import { CompanyInfo } from "../types";
import { getCompanyInfo, FreeAgentError } from "../services/freeagent";

interface UseFreeAgentState {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  companyInfo: CompanyInfo | null;
  error: string | null;
}

interface UseFreeAgentReturn extends UseFreeAgentState {
  refreshCompanyInfo: () => Promise<void>;
  handleError: (error: unknown, title: string) => void;
}

export function useFreeAgent(): UseFreeAgentReturn {
  const [state, setState] = useState<UseFreeAgentState>({
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    companyInfo: null,
    error: null,
  });

  const handleError = (error: unknown, title: string) => {
    console.error(`${title}:`, error);
    const message = error instanceof FreeAgentError ? error.message : String(error);

    setState((prev) => ({ ...prev, error: message }));

    showFailureToast(error, { title });
  };

  const fetchCompanyInfo = async (token: string): Promise<CompanyInfo | null> => {
    try {
      const company = await getCompanyInfo(token);
      return company;
    } catch (error) {
      handleError(error, "Failed to fetch company info");
      return null;
    }
  };

  const refreshCompanyInfo = async () => {
    if (!state.accessToken) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    const company = await fetchCompanyInfo(state.accessToken);
    setState((prev) => ({
      ...prev,
      companyInfo: company,
      isLoading: false,
    }));
  };

  useEffect(() => {
    async function initialize() {
      try {
        const { token } = getAccessToken();

        if (!token) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
            error: "Not authenticated",
          }));

          showToast({
            style: Toast.Style.Failure,
            title: "Not authenticated",
            message: "Please authenticate with FreeAgent to continue.",
          });
          return;
        }

        setState((prev) => ({
          ...prev,
          accessToken: token,
          isAuthenticated: true,
        }));

        const company = await fetchCompanyInfo(token);

        setState((prev) => ({
          ...prev,
          companyInfo: company,
          isLoading: false,
        }));
      } catch (error) {
        handleError(error, "Authentication check failed");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    initialize();
  }, []);

  return {
    ...state,
    refreshCompanyInfo,
    handleError,
  };
}
