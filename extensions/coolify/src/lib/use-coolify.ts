import { showFailureToast, useFetch } from "@raycast/utils";
import { API_TOKEN, COOLIFY_URL } from "./config";

// function gen(endpoint: string) {
//     try {
//         return new URL(`api/v1/${endpoint}`, "COOLIFY_URL").toString();
//     } catch (error) {
//         //
//     }
// }

export default function useCoolify<T>(endpoint: string, options?: {method: string, body: BodyInit, execute: boolean}) {
    try {
        const url = new URL("api/v1/", COOLIFY_URL);
        const { isLoading, data } = useFetch<T>(url + endpoint, {
            method: options?.method || "GET",
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: options?.body ? JSON.stringify(options.body) : undefined,
            execute: options?.execute || true
        });
        return { isLoading, data };
    } catch (error) {
        showFailureToast(error);
        return { isLoading: false, data: undefined };
    }
    // return useFetch<T>(gen(endpoint), {
    //     method: options?.method || "GET",
    //     headers: {
    //         Authorization: `Bearer ${API_TOKEN}`,
    //         "Content-Type": "application/json"
    //     },
    //     execute: options?.execute || true,
    //     async onError(error) {
    //         await showFailureToast(error);
    //     },
    // });
}