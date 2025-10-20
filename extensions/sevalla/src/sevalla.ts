import { getPreferenceValues } from "@raycast/api";

const {api_key, company_id} = getPreferenceValues<Preferences>();
const API_URL = "https://api.sevalla.com/v2/";
const API_HEADERS = {
    Authorization: `Bearer ${api_key}`,
    "Content-Type": "application/json"
}
export const makeRequest = async<T>(endpoint: string, options?: RequestInit) => {
    const searchParams = new URLSearchParams({company: company_id});
    const response = await fetch(API_URL + endpoint + `?${searchParams}`, {
        method: options?.method,
        headers: API_HEADERS,
        body: options?.body
    })
    const result = await response.json();
    if (!response.ok) {
        const err = result as { error: string } | { message: string };
        throw new Error('error' in err ? err.error : err.message);
    }
    return result as T;
}