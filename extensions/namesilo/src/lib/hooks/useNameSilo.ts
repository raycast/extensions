import { showFailureToast, useFetch } from "@raycast/utils";
import { ErrorResponse, SuccessResponse } from "../types";
import generateApiUrl from "../utils/generateApiUrl";

export default function useNameSilo<T>(
  operation: string,
  params?: { [key: string]: string | string[] },
  {
    execute = true,
    onData,
    onError,
  }: { execute?: boolean; onData?: (data: SuccessResponse<T>["reply"]) => void; onError?: () => void } = {},
) {
  const url = generateApiUrl(operation, params);
  const { isLoading, data, error, revalidate } = useFetch(url, {
    mapResult(result: SuccessResponse<T> | ErrorResponse) {
      if (result.reply.detail !== "success") {
        throw new Error(result.reply.detail || "Something went wrong");
      }
      return {
        data: (result as SuccessResponse<T>).reply,
      };
    },
    execute,
    onData,
    async onError(error) {
      await showFailureToast(error, { title: "NameSilo Error" });
      onError?.();
    },
  });
  return { isLoading, data, error, revalidate };
}
