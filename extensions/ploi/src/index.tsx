import { ServersList } from "./Server";
import axios from "axios";
import { PLOI_API_URL } from "./config";
import { getHeaders } from "./helpers";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const headers = getHeaders(preferences.ploi_api_key);

axios.defaults.baseURL = PLOI_API_URL;
axios.defaults.headers.common["Authorization"] = headers.Authorization;
axios.defaults.headers.common["Content-Type"] = headers["Content-Type"];
axios.defaults.headers.common["Accept"] = headers["Accept"];
axios.defaults.headers.common["X-Custom-Ploi-Agent"] = headers["X-Custom-Ploi-Agent"];

const Ploi = () => <ServersList />;

export default Ploi;
