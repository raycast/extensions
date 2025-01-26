import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { ErrorResult, Result } from "./types";

export default function useOla<T>(endpoint: string, { method="GET", onData, onError, body }: {method?: string, onData?: (data: T) => void, onError?: (error: Error) => void, body?: string} = {}) {
    return useFetch(API_URL + endpoint, {
        method,
        headers: API_HEADERS,
        body,
        async parseResponse(response) {
            if (!response.ok) {
                const result: ErrorResult  = await response.json();
                throw new Error(result.message);
            }
            const result = await response.json();
            return result;
        },
        mapResult(result: Result<T>) {
            return {
                data: result.data
            }
        },
        onError,
        onData
    })
}