import { useCachedPromise } from "@raycast/utils";
import { ClickUpClient } from "../utils/clickUpClient";
import { AxiosError } from "axios";

export default function useClickUp<T>(endpoint: string) {
  type ErrorResult = {
    err: string;
    ECODE: string;
  };
  const { isLoading, data } = useCachedPromise(
    async () => {
      try {
        const response = await ClickUpClient<T>(endpoint);
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
    }
  );
  return { isLoading, data };
}
