import { getPreferenceValues } from "@raycast/api";
import { Vartiq } from "vartiq";

const { api_key_dev, api_key_prod, environment } = getPreferenceValues<Preferences>();
export const vartiq = new Vartiq(environment === "dev" ? api_key_dev : api_key_prod);
