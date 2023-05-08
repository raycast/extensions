import {
  environment,
  LaunchType,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { createCalendars } from "../api/eventkit";

type PreferenceType = "extension" | "command";

interface APIKeySource {
  title: string;
  url: string;
}

export class PreferenceError extends Error {
  preferenceType: PreferenceType;
  apiKeySource?: APIKeySource;
  constructor(message: string, preferenceType: "extension" | "command", apiKeySource?: APIKeySource) {
    super(message);
    this.preferenceType = preferenceType;
    this.apiKeySource = apiKeySource;
  }
}

export function showCalendarNotFoundToast(missingCalendarNames: string[]): Promise<Toast> {
  return showToast({
    style: Toast.Style.Failure,
    title: "Calendar Not Found",
    message: `Calendar${missingCalendarNames.length === 1 ? "" : "s"} titled ${missingCalendarNames
      .map((name) => '"' + name + '"')
      .join(", ")} not found in your database.`,
    primaryAction: {
      title: "Create New Calendar" + (missingCalendarNames.length === 1 ? "" : "s"),
      onAction: (toast) =>
        void Promise.all([toast.hide(), createCalendars(missingCalendarNames).then((id) => open(`ical://${id}`))]),
    },
    secondaryAction: {
      title: "Open Raycast Settings",
      onAction: (toast) => void Promise.all([toast.hide(), openExtensionPreferences()]),
    },
  });
}

export function getPrimaryAction(error: unknown): Toast.ActionOptions | undefined {
  if (error instanceof PreferenceError) {
    return {
      title: "Open Raycast Settings",
      onAction:
        error.preferenceType === "extension"
          ? (toast) => void Promise.all([toast.hide(), openExtensionPreferences()])
          : (toast) => void Promise.all([toast.hide(), openCommandPreferences()]),
    };
  }
}

export function getSecondaryAction(error: unknown): Toast.ActionOptions | undefined {
  if (error instanceof PreferenceError) {
    const apiKeySource = error.apiKeySource;
    if (apiKeySource) {
      return {
        title: `Open ${apiKeySource.title}`,
        onAction: (toast) => void Promise.all([toast.hide(), open(apiKeySource.url)]),
      };
    }
  }
}

export function showErrorToast(title: string, error: unknown): Promise<Toast> | Promise<void> {
  const message = error instanceof Error ? error.message : undefined;

  if (environment.commandMode !== "view" && environment.launchType === LaunchType.UserInitiated) {
    return showHUD(title + (message ? `: ${message}` : ""));
  }

  return showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: getPrimaryAction(error),
    secondaryAction: getSecondaryAction(error),
  });
}
