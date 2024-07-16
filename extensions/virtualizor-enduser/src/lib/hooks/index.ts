import { showFailureToast, useFetch } from "@raycast/utils";
import { CommonResponse, ErrorResponse, SuccessPaginatedResponse, SuccessResponse } from "../types";
import { openExtensionPreferences } from "@raycast/api";
import generateAPIUrl from "../utils/generate-api-url";

type UseVirtualizorOptions<T> = {
    params?: {[key: string]: string},
    execute: boolean,
    onWillExecute?: () => void;
    onData?: (data: SuccessResponse<T>) => void;
    onError?: () => void;
}
export function useVirtualizor<T>(act: string, options?: UseVirtualizorOptions<T>) {
        const { execute=true, params={} } = options || {};

        const { isLoading, data, revalidate } = useFetch(generateAPIUrl(act, params), {
            async parseResponse(response) {
                const data = await handleParseResponse(response);
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
                await handleError(error);
                options?.onError?.();
            },
        })

        return { isLoading, data, revalidate };
}

export function useVirtualizorPaginated<T>(act: string, options?: UseVirtualizorOptions<T>) {
        const { execute=true, params={} } = options || {};

        const { isLoading, data, revalidate, pagination } = useFetch(
            (options) =>
              generateAPIUrl(act, params) + "&" +
              new URLSearchParams({ page: String(options.page + 1) }).toString(),
            {
                async parseResponse(response) {
                    const data = await handleParseResponse(response);
                    return data as SuccessPaginatedResponse<T>;
                },
              mapResult(result) {
                const key = act as keyof typeof result;
                const obj = result[key] as {[key: string]: T};
                const data = Object.values(obj);
                return {
                  data,
                  hasMore: (result.page.start + result.page.len) < Number(result.page.maxNum),
                };
              },
              keepPreviousData: true,
              execute,
              initialData: [],
            async onError(error) {
                await handleError(error);
                options?.onError?.();
            }
            },
          );

        return { isLoading, data, revalidate, pagination };
}

async function handleParseResponse(response: Response) {
    const result = await response.text();
    const data = await JSON.parse(result) as CommonResponse | SuccessResponse<unknown> | ErrorResponse;
    if ("error" in data) throw new Error(data.error[0]);
    return data;
}
async function handleError(error: Error) {
    await showFailureToast(error, {
        message: "Are you sure Preferences are correct?",
        primaryAction: {
            title: "Open Extension Preferences",
            async onAction() {
                await openExtensionPreferences();
            }
        }
    });
}