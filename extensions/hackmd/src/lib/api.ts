import API from "@hackmd/api";
import { getPreferences } from "./preference";

const { api_base_url, api_token } = getPreferences();

export const api = new API(api_token, api_base_url);
export default api;
