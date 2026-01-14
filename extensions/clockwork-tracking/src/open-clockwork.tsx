import { open, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default async function Command() {
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();
  const url = `${jiraBaseUrl}/plugins/servlet/ac/clockwork-cloud/clockwork-mywork`;
  await open(url);
}
