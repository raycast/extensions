import { environment, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
const commandName = environment.commandName;

export const CONFLUENCE_BASE_URL = preferences.confluenceBaseUrl;
export const CONFLUENCE_PAT = preferences.confluencePAT;

export const JIRA_BASE_URL = preferences.jiraBaseUrl;
export const JIRA_PAT = preferences.jiraPAT;

const DEFAULT_PAGINATION_SIZE = 20;
export const PAGINATION_SIZE = formatPaginationSize(preferences.paginationSize);
export const DEBUG_ENABLE = preferences.debugEnable;
export const REPLACE_CURRENT_USER = preferences.replaceCurrentUser;

export const CURRENT_PAT = commandName?.startsWith("jira-") ? JIRA_PAT : CONFLUENCE_PAT;
export const CURRENT_BASE_URL = commandName?.startsWith("jira-") ? JIRA_BASE_URL : CONFLUENCE_BASE_URL;

const DEFAULT_WORKING_DAYS_PER_WEEK = 5;
const DEFAULT_WORKING_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_WEEK = formatWorkingDaysPerWeek(preferences.jiraWorkingDaysPerWeek);
export const WORKING_HOURS_PER_DAY = formatWorkingHoursPerDay(preferences.jiraWorkingHoursPerDay);
export const WORKING_SERCONDS_PER_DAY = WORKING_HOURS_PER_DAY * 3600;

function formatPaginationSize(paginationSize: string) {
  const size = parseInt(paginationSize);
  return size > 0 ? size : DEFAULT_PAGINATION_SIZE;
}

function formatWorkingHoursPerDay(input: string): number {
  const validFormat = /^\d+(\.\d{1})?$/;

  if (!validFormat.test(input)) {
    return DEFAULT_WORKING_HOURS_PER_DAY;
  }

  return parseFloat(input);
}

function formatWorkingDaysPerWeek(input: string): number {
  const validFormat = /^\d+$/;

  if (!validFormat.test(input)) {
    return DEFAULT_WORKING_DAYS_PER_WEEK;
  }

  return parseInt(input);
}
