import { usePromise } from "@raycast/utils";
import { ClickUpClient } from "../utils/clickUpClient";
import { AxiosError } from "axios";

export default function useClickUp<T>(endpoint: string, { apiVersion }: { apiVersion: 2 | 3 } = { apiVersion: 2 }) {
  type ErrorResult = {
    err: string;
    ECODE: string;
  };
  const { isLoading, data } = usePromise(
    async () => {
      try {
        const response = await ClickUpClient<T>(endpoint, "GET", undefined, undefined, apiVersion);
        return response.data;
      } catch (error) {
        const result = error as AxiosError<ErrorResult>;
        if (result.response?.data) throw new Error(`${result.response.data.err} (${result.response.data.ECODE})`);
        throw new Error();
      }
    },
    [],
    {
      failureToastOptions: {
        title: "ClickUp Error",
      },
    },
  );
  return { isLoading, data };
}
