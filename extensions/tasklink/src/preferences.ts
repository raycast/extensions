import { getPreferenceValues } from "@raycast/api";

export enum IssueIdFormat {
  JIRA_STYLE = "([A-Z]+-\\d+)",
  GITHUB_STYLE = "#(\\d+)",
}

export type IssueIdStyle = keyof typeof IssueIdFormat;

interface Preferences {
  url: string;
  format: IssueIdStyle;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
