import { getPreferenceValues, open } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export default async () => {
  await open(`https://${preferences.primaryTeamName}.esa.io/posts/new`);
};
