import { getPreferenceValues } from "@raycast/api";
import { ApifyClient } from "apify-client";

const { token } = getPreferenceValues<Preferences>();
export const apify = new ApifyClient({ token });
