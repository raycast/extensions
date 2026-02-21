import { getPreferenceValues } from "@raycast/api"
import { Account, PaginationInfo, Transaction } from "./types";

const {maybe_url,api_key} = getPreferenceValues<ExtensionPreferences>();
export const buildMaybeUrl = (path: string) => new URL(path, maybe_url).toString();
const request = async <T>(endpoint: string) => {
    const url = buildMaybeUrl(`api/v1/${endpoint}`);
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "X-Api-Key": api_key
        }
    })
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.json();
    return result as T;
}
export const maybe = {
    accounts: {
        list: (props: {page: number}) => request<{accounts: Account[]} & PaginationInfo>(`accounts?page=${props.page}`)
    },
    transactions: {
        list: (props: {page: number}) => request<{transactions: Transaction[]} & PaginationInfo>(`transactions?page=${props.page}`)
    }
}