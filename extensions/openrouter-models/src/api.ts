import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ModelsResponse } from "./types";

const API_BASE_URL = "https://openrouter.ai/api/v1";

// Common headers used in all requests
const COMMON_HEADERS = {
  "HTTP-Referer": "https://raycast.com/openrouter",
  "X-Title": "Raycast OpenRouter Extension",
};

// Helper function for showing error toasts - simplified after credits removal
const showErrorToast = (error: Error) => {
  showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message,
  });
};

export const useModels = () =>
  useFetch<ModelsResponse>(`${API_BASE_URL}/models`, {
    headers: COMMON_HEADERS,
    keepPreviousData: true,
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }
      return response.json();
    },
    onError(error) {
      showErrorToast(error);
    },
  });
