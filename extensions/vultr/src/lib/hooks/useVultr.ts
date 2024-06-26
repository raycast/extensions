import { useFetch } from "@raycast/utils"
import { API_HEADERS, API_URL } from "../constants"

export default function useVultr<T>(endpoint: string) {
    const { isLoading, data } = useFetch<T>(API_URL + endpoint, {
        headers: API_HEADERS
    });

    return { isLoading, data };
}