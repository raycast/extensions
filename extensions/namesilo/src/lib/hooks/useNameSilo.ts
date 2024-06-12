import { useFetch } from "@raycast/utils";
import { API_PARAMS, API_URL } from "../constants";
import { ErrorResponse, SuccessResponse } from "../types";

export default function useNameSilo<T>(operation: string, params?: URLSearchParams) {
    const { isLoading, data, error, revalidate } = useFetch(API_URL + operation + "?" + API_PARAMS.toString() + (params ? `&${params}` : ""), {
        mapResult(result: SuccessResponse<T> | ErrorResponse) {
            if (result.reply.detail!=="success") {
                throw new Error(result.reply.detail);
            }
            return {
                data: (result as SuccessResponse<T>).reply
            }
        }
    });
    return { isLoading, data, error, revalidate };
}