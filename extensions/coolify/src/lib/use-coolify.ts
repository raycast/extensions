import { showFailureToast, useFetch } from "@raycast/utils";
import { API_TOKEN, COOLIFY_URL } from "./config";

type UseCoolify<T> = {
    method: string;
    body?: Record<string, string | boolean>;
    execute: boolean;
    onError?: () => void;
    onData?: (data: T) => void;
}
export default function useCoolify<T>(endpoint: string, { method, body, execute, onData, onError }: UseCoolify<T> = { method: "GET", execute: true  }) {
    const url = new URL("api/v1/", COOLIFY_URL);
    const { isLoading, data, revalidate } = useFetch<T>(url + endpoint, {
        method,
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined,
        execute,
        onData,
        async onError(error) {
            await showFailureToast(error);
            onError?.();
        }
    });
    return { isLoading, data, revalidate };
}