import { getPreferenceValues } from "@raycast/api";

const SOLUSVM_URL = new URL(getPreferenceValues<Preferences>().solusVM_url);
const API_KEY = getPreferenceValues<Preferences>().api_key;
const API_HASH = getPreferenceValues<Preferences>().api_hash;

export const API_URL = `${SOLUSVM_URL}/api/client/command.php?key=${API_KEY}&hash=${API_HASH}&action=`;
