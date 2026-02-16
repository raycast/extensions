import { getPreferenceValues } from "@raycast/api";
import { Item } from "./types";

const { sendy_url, api_key } = getPreferenceValues<Preferences>();
export const buildSendyUrl = (path: string) => new URL(path, sendy_url);
const request = async <T>(endpoint: string, payload?: Record<string,string>) => {
    const url = buildSendyUrl(`api/${endpoint}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({api_key,...payload})
    })
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.json();
    return result as T;
}

export const getBrands = () => request<{ [key: string]: Item }>("brands/get-brands.php")
export const getLists = (brandId: string) => request<{[key:string]: Item}>("lists/get-lists.php", {brand_id: brandId, include_hidden: "no"})