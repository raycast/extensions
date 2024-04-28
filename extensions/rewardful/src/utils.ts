import { getPreferenceValues } from "@raycast/api";
import moment from "moment";

const preferences = getPreferenceValues();

export const baseUrl = "https://api.getrewardful.com/v1";
export const siteUrl = "https://app.getrewardful.com";

const localePref = preferences.locale || "en-us";
moment.locale(localePref);
export { moment };
