import { getPreferenceValues } from "@raycast/api";

const {api_key, postiz_url} = getPreferenceValues<Preferences>();
export const buildPostizUrl = (endpoint: string, params: Record<string, number | string> = {}) => {
    try {
        const url = new URL(postiz_url);
        url.pathname = (url.host==="api.postiz.com") ? "public/v1" : "api/public/v1";
        url.pathname += `/${endpoint}`;
        Object.entries(params).forEach(([key,val]) => url.searchParams.append(key, String(val)));
        // console.log(url)
        return url.toString();
    } catch {
        return "";
    }
}
export const POSTIZ_HEADERS = {
    Authorization: api_key
}