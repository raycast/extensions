import { getPreferenceValues } from "@raycast/api";
import JiraApi from "jira-client";
import { Preferences } from "./utils";

export function getJiraClient() {
  const preferences = getPreferenceValues<Preferences>();
  const instanceUrl = new URL(preferences.instance);
  const protocol = instanceUrl.protocol.replace(/:/g, "");
  const domain = instanceUrl.hostname;
  const jiraClient = new JiraApi({
    protocol: protocol,
    host: domain,
    bearer: preferences.token,
  });
  return jiraClient;
}
