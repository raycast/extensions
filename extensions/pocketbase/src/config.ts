import { getPreferenceValues } from "@raycast/api";

export const {
  pocketbase_url: POCKETBASE_URL,
  pocketbase_email: POCKETBASE_EMAIL,
  pocketbase_password: POCKETBASE_PASSWORD,
} = getPreferenceValues<Preferences>();
