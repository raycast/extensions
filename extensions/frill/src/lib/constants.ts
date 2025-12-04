import { getPreferenceValues } from "@raycast/api";

const API_KEY = getPreferenceValues<Preferences>().api_key;
const API_TOKEN = btoa(API_KEY + ":");
export const API_HEADERS = {
  Authorization: `Basic ${API_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};
export const API_URL = "https://api.frill.co/v1/";

export const FRILL_URL = getPreferenceValues<Preferences>().frill_url.endsWith("/")
  ? getPreferenceValues<Preferences>().frill_url
  : getPreferenceValues<Preferences>().frill_url + "/";

export const IDEA_FILTERS = {
  is_private: "Private",
  is_public: "Public",
  is_bug: "Bug",
  is_archived: "Archived",
  is_shorlisted: "Shortlisted",
  is_completed: "Completed",
  is_pinned: "Pinned",
};

export const DEFAULT_PAGINATION_LIMIT = 100;
