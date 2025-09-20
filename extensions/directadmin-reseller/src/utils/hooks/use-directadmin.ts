import { useFetch } from "@raycast/utils";
import { BodyRequest } from "../../types";
import { DIRECTADMIN_URL } from "../constants";
import { showToast, Toast } from "@raycast/api";
import { generateApiToken } from "../functions";

type UseDirectAdminOptions<T> = {
  params?: { [key: string]: string };
  animatedToastMessage: string;
  body?: BodyRequest;
  userToImpersonate?: string;
  onData?: (data: T) => void;
  successToastMessage?: string;
};
type LegacyError = {
  client_ip: string;
  error: string;
  have_lost_password: "0" | "1";
  success: "no";
};
type JsonError = {
  type: string;
  message?: string;
  exitCode?: number;
  output?: string;
  path?: string;
};

function useDirectAdmin<T>(
  endpoint: string,
  options: UseDirectAdminOptions<T> = { params: {}, animatedToastMessage: "", userToImpersonate: "" },
) {
  const API_PARAMS = new URLSearchParams({
    ...options.params,
  });
  const isLegacyApi = endpoint.includes("CMD_API");
  const API_URL = new URL(endpoint, DIRECTADMIN_URL) + `?${API_PARAMS}`;

  const { animatedToastMessage, userToImpersonate } = options;

  const token = generateApiToken(userToImpersonate);
  const headers = { Authorization: `Basic ${token}`, Accept: "application/json", "Content-Type": "application/json" };

  const method = !options.body ? "GET" : "POST";
  const { isLoading, data, error, revalidate } = useFetch(API_URL, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
    },
    async parseResponse(response) {
      if (!response.ok) {
        if (isLegacyApi) {
          const result = (await response.json()) as LegacyError;
          throw new Error(result.error);
        } else {
          const result = (await response.json()) as JsonError;
          throw new Error(result.message || result.type);
        }
      }
      const result = (await response.json()) as T;
      return result;
    },
    keepPreviousData: true,
    async onData(data) {
      if (options.successToastMessage) await showToast(Toast.Style.Success, "SUCCESS", options.successToastMessage);
      options.onData?.(data);
    },
    failureToastOptions: {
      title: "DirectAdmin Error",
    },
  });
  return { isLoading, data, error, revalidate };
}

export function useLegacyDirectAdmin<T>(
  cmd: string,
  options: UseDirectAdminOptions<T> = { params: {}, animatedToastMessage: "", userToImpersonate: "" },
) {
  return useDirectAdmin<T>(`CMD_API_${cmd}`, {
    ...options,
    params: {
      ...options.params,
      json: "yes",
    },
  });
}

export function useJsonDirectAdmin<T>(
  cmd: string,
  options: UseDirectAdminOptions<T> = { params: {}, animatedToastMessage: "", userToImpersonate: "" },
) {
  return useDirectAdmin<T>(`api/${cmd}`, options);
}
