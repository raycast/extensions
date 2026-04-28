import { getPreferenceValues, open } from "@raycast/api";

type Preferences = {
  workosUrl: string;
};

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  await open(preferences.workosUrl || "https://workos-dashboard.vercel.app");
}
