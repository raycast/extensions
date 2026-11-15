import { getPreferenceValues } from "@raycast/api";
import { Domain } from "./types";

const {api_key} = getPreferenceValues<Preferences>();
const API_URL = "https://namecrane.com/api/v1/";

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
    const response = await fetch(API_URL + endpoint, {
        headers: {
            Authorization: `Bearer ${api_key}`,
        },
        ...options
    })
    const result = await response.json();
    if (!response.ok) {
        const err = result as {error: string} | {message: string, errors: Array<{[field:string]: string[]}>}
        throw new Error("error" in err ? err.error : err.message);
    }
    return result as T;
}
export const namecrane = {
    getBalance: () => makeRequest<{credit_balance: number}>("account/balance"),
    domains: {
        list: () => makeRequest<Domain[]>("domains"),
        nameservers: {
            get: (domain: string) => makeRequest<{nameservers: string[]}>(`domains/${domain}/nameservers`),
            set: (domain: string, nameservers: string[]) => makeRequest(`domains/${domain}/nameservers`, {method: "PUT", body: JSON.stringify({nameservers})})
        }
    }
}