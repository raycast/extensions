import { showFailureToast, useFetch } from "@raycast/utils";
import { API_BODY, API_HEADERS, API_URL } from "../../config";
import { ErrorResponse, SuccessResponse } from "../../types";

type useUptimeRobotOptions<T> = {
  onData?: (data: T) => void;
  onError?: () => void;
  execute?: boolean;
};
export default function useUptimeRobot<T, K extends string>(
  endpoint: string,
  values: { [key: string]: string },
  options?: useUptimeRobotOptions<T>,
) {
  const { execute = true } = options || {};
  const { isLoading, revalidate } = useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    method: "POST",
    body: new URLSearchParams({
      ...API_BODY,
      ...values,
    }).toString(),
    mapResult(result: SuccessResponse<{ [key in K]: T }> | ErrorResponse) {
      if (result.stat === "fail")
        throw new Error(result.error.message, {
          cause: result.error.type,
        });
      const key = Object.keys(result).find((key) => key !== "stat");
      const data = result[key as keyof typeof result] as T;
      return {
        data,
      };
    },
    onData(data) {
      options?.onData?.(data);
    },
    async onError(error) {
      await showFailureToast(error, { title: error.cause?.toString() || "Something went wrong" });
      options?.onError?.();
    },
    execute,
    keepPreviousData: true,
  });
  return { isLoading, revalidate };
}
