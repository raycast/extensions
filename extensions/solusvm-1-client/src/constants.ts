import { getPreferenceValues } from "@raycast/api";

export const CONFIRM_BEFORE_ACTIONS = getPreferenceValues<Preferences>().confirm_before_actions;

export const SOLUSVM_URL = getPreferenceValues<Preferences>().solusVM_url;
export const API_KEY = getPreferenceValues<Preferences>().api_key;
export const API_HASH = getPreferenceValues<Preferences>().api_hash;
