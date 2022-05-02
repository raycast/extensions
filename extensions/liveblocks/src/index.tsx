import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  secret: string;
}

export default async () => {
  const preferences = getPreferenceValues<Preferences>();

  console.log(preferences);
}
