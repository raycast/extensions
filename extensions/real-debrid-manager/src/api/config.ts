import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

export const API_BASE_URL = "https://api.real-debrid.com/rest/1.0";
const { api_token } = getPreferenceValues<Preferences>();

export const fetch = axios.create({
  baseURL: `${API_BASE_URL}/`,
  headers: { authorization: `Bearer ${api_token}` },
});

export default fetch;
