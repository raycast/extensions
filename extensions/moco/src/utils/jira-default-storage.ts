import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  jiraDefaultKey,
  JiraDefault,
  JiraScope,
  parseJiraDefault,
  TimerDefault,
  parseTimerDefault,
  timerDefaultKey,
} from "./jira-defaults";

const tenant = () => getPreferenceValues<{ url_prefix: string }>().url_prefix;

export async function loadJiraDefault(scope: JiraScope): Promise<JiraDefault | undefined> {
  return parseJiraDefault(await LocalStorage.getItem(jiraDefaultKey(tenant(), scope)));
}

export async function listJiraDefaults(): Promise<JiraDefault[]> {
  const prefix = jiraDefaultKey(tenant());
  const items = await LocalStorage.allItems();
  return Object.entries(items)
    .flatMap(([key, value]) => {
      const rule = key.startsWith(prefix) ? parseJiraDefault(value) : undefined;
      return rule && key === jiraDefaultKey(tenant(), rule) ? [rule] : [];
    })
    .sort((a, b) => a.host.localeCompare(b.host) || a.prefix.localeCompare(b.prefix));
}

export async function saveJiraDefault(rule: JiraDefault): Promise<void> {
  await LocalStorage.setItem(jiraDefaultKey(tenant(), rule), JSON.stringify(rule));
}

export async function removeJiraDefault(scope: JiraScope): Promise<void> {
  await LocalStorage.removeItem(jiraDefaultKey(tenant(), scope));
}

export async function loadTimerDefault(): Promise<TimerDefault | undefined> {
  return parseTimerDefault(await LocalStorage.getItem(timerDefaultKey(tenant())));
}

export async function saveTimerDefault(defaults: TimerDefault): Promise<void> {
  await LocalStorage.setItem(timerDefaultKey(tenant()), JSON.stringify(defaults));
}

export async function removeTimerDefault(): Promise<void> {
  await LocalStorage.removeItem(timerDefaultKey(tenant()));
}
