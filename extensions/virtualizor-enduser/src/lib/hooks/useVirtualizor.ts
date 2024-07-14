import { showFailureToast, useFetch } from "@raycast/utils";
import { API_KEY, API_PASS, VIRTUALIZOR_URL } from "../config";
import { CommonResponse, SuccessResponse } from "../types";
import { openExtensionPreferences } from "@raycast/api";

export default function useVirtualizor<T>(act: string, options?: {
    params?: {[key: string]: string},
    execute: boolean,
    onWillExecute?: () => void;
    onData?: (data: SuccessResponse<T>) => void;
    onError?: () => void;
}) {
    try {
        const { execute=true, params={} } = options || {};

        const BASE_URL = new URL(VIRTUALIZOR_URL);
        const API_URL = BASE_URL + "index.php?";
        const API_PARAMS = new URLSearchParams({
            act,
            api: "json",
            apikey: API_KEY,
            apipass: API_PASS,
            ...params
        });
        
        const { isLoading, data, revalidate } = useFetch(API_URL + API_PARAMS.toString(), {
            async parseResponse(response) {
                const result = await response.text();
                const data = await JSON.parse(result) as CommonResponse | SuccessResponse<T>;
                
                const successKeys = ["done", "info"];
                const isSuccess = Object.keys(data).some(key => successKeys.includes(key));
                if (!isSuccess) throw new Error;
                return data as SuccessResponse<T>;
            },
            keepPreviousData: true,
            execute,
            onWillExecute() {
                options?.onWillExecute?.();
            },
            onData(data) {
                options?.onData?.(data);
            },
            async onError(error) {
                showFailureToast(error, {
                    message: "Are you sure Preferences are correct?",
                    primaryAction: {
                        title: "Open Extension Preferences",
                        async onAction() {
                            await openExtensionPreferences();
                        }
                    }
                });
                options?.onError?.();
            },
        })

        return { isLoading, data, revalidate, BASE_URL };
    } catch (error) {
        showFailureToast(error);
        return { isLoading: false, error };
    }
}