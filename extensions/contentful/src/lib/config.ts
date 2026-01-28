import { getPreferenceValues } from "@raycast/api";

export const CONTENTFUL_SPACE = getPreferenceValues<Preferences>().space;
export const CONTENTFUL_TOKEN = getPreferenceValues<Preferences>().token;
export const CONTENTFUL_ENVIRONMENT = getPreferenceValues<Preferences>().environment || "master";

export const CONTENTFUL_LIMIT = 100;
export const CONTENTFUL_APP_URL = "https://app.contentful.com/";
export const CONTENTFUL_LOCALE = "en-US";

const spaceLink = `${CONTENTFUL_APP_URL}spaces/${CONTENTFUL_SPACE}/`;
export const CONTENTFUL_LINKS = {
  space: spaceLink,
  roles: `${spaceLink}settings/roles`,
  users: `${spaceLink}settings/users`,
};
