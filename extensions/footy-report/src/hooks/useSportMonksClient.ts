import { usePromise } from "@raycast/utils";
import useAPIKey from "@src/hooks/useAPIKey";
import axios, { AxiosError } from "axios";
import getClient from "@src/api/client";

type Params = {
  path: string;
  method: "get" | "post";
  params?: Record<string, unknown>;
  execute?: boolean;
};

const useSportMonksClient = ({ path, method, params, execute }: Params) => {
  const apiKey = useAPIKey();
  const { data, isLoading, error, revalidate } = usePromise(
    async (path: string) => {
      try {
        const {
          data,
          status,
          headers,
          config: { baseURL },
        } = await getClient(apiKey).request({ method, url: path, params });
        const finalData = data?.data;
        return { data: finalData, status, headers, baseURL };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError: AxiosError = error;
          if (axiosError.response) {
            return {
              baseURL: axiosError.config?.baseURL,
              data: axiosError.response.data,
              status: axiosError.response.status,
              headers: axiosError.response.headers,
            };
          }
        }
      }
    },
    [path],
    {
      execute,
    },
  );
  return { data, revalidate, isLoading, error };
};

export default useSportMonksClient;
