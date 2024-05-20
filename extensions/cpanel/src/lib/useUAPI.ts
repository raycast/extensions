import { useFetch } from "@raycast/utils";
import { API_TOKEN, CPANEL_URL, CPANEL_USERNAME } from "./constants";
import { ErrorResponse, SuccessResponse } from "./types";

export default function useUAPI<T>(module: string, functionName: string, params?: {[key: string]: string | number}) {
    try {
        const API_URL = new URL(`execute/${module}/${functionName}`, CPANEL_URL);
        if (params) Object.entries(params).forEach(([key, val]) => API_URL.searchParams.append(key, val.toString()));

        const { isLoading, data, error } = useFetch(API_URL.toString(), {
            headers: {
                Authorization: `cpanel ${CPANEL_USERNAME}:${API_TOKEN}`
            },
            mapResult(result: ErrorResponse | SuccessResponse<T>) {
                if (!result.status) throw(result.errors);
                return {
                    data: result.data
                }
            }
        });
        return { isLoading, data, error };
    } catch (error) {
        return { isLoading: false, data: undefined, error };
    }
}