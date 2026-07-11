import { getPreferenceValues } from "@raycast/api";
import { SearchObjectConfig, WorkbenchPreferences } from "./types";

export const DEFAULT_SEARCH_OBJECTS: SearchObjectConfig[] = [
  { apiName: "Account", fields: ["Id", "Name"], titleField: "Name", subtitleFields: [] },
  {
    apiName: "Contact",
    fields: ["Id", "Name", "Email", "Account.Name"],
    titleField: "Name",
    subtitleFields: ["Email", "Account.Name"],
  },
  {
    apiName: "Lead",
    fields: ["Id", "Name", "Company", "Email"],
    titleField: "Name",
    subtitleFields: ["Company", "Email"],
  },
  {
    apiName: "Opportunity",
    fields: ["Id", "Name", "StageName", "Account.Name"],
    titleField: "Name",
    subtitleFields: ["StageName", "Account.Name"],
  },
  {
    apiName: "Case",
    fields: ["Id", "CaseNumber", "Subject", "Status"],
    titleField: "CaseNumber",
    subtitleFields: ["Subject", "Status"],
  },
];

const API_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const FIELD_PATH = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/;

export function getPreferences(): WorkbenchPreferences {
  return getPreferenceValues<WorkbenchPreferences>();
}

export function parseAdditionalObjects(value?: string): SearchObjectConfig[] {
  if (!value?.trim()) return [];

  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const match = part.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\(([^)]*)\))?$/);
      if (!match || !API_NAME.test(match[1])) return [];
      const configuredFields = (match[2] ?? "Name")
        .split(",")
        .map((field) => field.trim())
        .filter((field) => FIELD_PATH.test(field));
      const fields = Array.from(new Set(["Id", ...(configuredFields.length ? configuredFields : ["Name"])]));
      return [
        {
          apiName: match[1],
          fields,
          titleField: fields.find((field) => field !== "Id") ?? "Id",
          subtitleFields: fields.filter((field) => field !== "Id").slice(1, 3),
        },
      ];
    });
}

export function getSearchObjects(): SearchObjectConfig[] {
  const additional = parseAdditionalObjects(getPreferences().additionalObjects);
  const byName = new Map(DEFAULT_SEARCH_OBJECTS.map((config) => [config.apiName, config]));
  additional.forEach((config) => byName.set(config.apiName, config));
  return [...byName.values()];
}

export function getHistoryPolicy(): { days: number; limit: number } {
  const preferences = getPreferences();
  const days = Number.parseInt(preferences.historyDays, 10);
  const limit = Number.parseInt(preferences.historyLimit, 10);
  return {
    days: Number.isFinite(days) && days > 0 ? days : 30,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100,
  };
}
