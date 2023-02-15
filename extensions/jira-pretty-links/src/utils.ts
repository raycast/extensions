import { getPreferenceValues } from "@raycast/api";
import { IssueObject } from "jira-client";

export interface Preferences {
  instance: string;
  token: string;
  linktextformat: string;
}

export function formatString(template: string, params: any) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${template}\`;`)(...vals);
}

export function getRocketLink(issue: IssueObject) {
  const preferences = getPreferenceValues<Preferences>();
  const linkText = formatString(preferences.linktextformat, { key: issue.key, summary: issue.fields.summary });
  return `<${preferences.instance}/browse/${issue.key}|${linkText}>`;
}

export function getMarkdownLink(issue: IssueObject) {
  const preferences = getPreferenceValues<Preferences>();
  const linkText = formatString(preferences.linktextformat, { key: issue.key, summary: issue.fields.summary });
  return `[${linkText}](${preferences.instance}/browse/${issue.key})`;
}
