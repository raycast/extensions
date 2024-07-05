import { useFetch } from "@raycast/utils";
import { ErrorResponse, SuccessResponse } from "../types";
import generateApiUrl from "../utils/generateApiUrl";

export default function useNameSilo<T>(operation: string, params?: { [key: string]: string | string[] }) {
  const url = generateApiUrl(operation, params);
  const { isLoading, data, error, revalidate } = useFetch(url, {
    mapResult(result: SuccessResponse<T> | ErrorResponse) {
      if (result.reply.detail !== "success") {
        throw new Error(result.reply.detail || "NameSilo Error");
      }
      return {
        data: (result as SuccessResponse<T>).reply,
      };
    },
  });
  return { isLoading, data, error, revalidate };
}
