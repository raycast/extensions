import { getPreferenceValues} from "@raycast/api";
import { ErrorResponse } from "./types";

const {api_key} = getPreferenceValues<Preferences>();
export const API_URL = "https://inbound.new/api/v2/";
export const API_HEADERS = {
    Authorization: `Bearer ${api_key}`,
    "Content-Type": "application/json"
}
export const parseInboundResponse = async (response: Response) => {
    const result = await response.json();
    if (!response.ok) throw new Error((result as ErrorResponse).error);
    return result;
}