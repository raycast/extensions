import { getPreferenceValues } from "@raycast/api";
import { Vartiq } from "vartiq";

const {api_key} = getPreferenceValues<Preferences>();
export const vartiq = new Vartiq(api_key);