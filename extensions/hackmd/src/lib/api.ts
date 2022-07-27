import API from "@hackmd/api";
import { getAPIToken } from "./preference";

export const api = new API(getAPIToken());
export default api;
