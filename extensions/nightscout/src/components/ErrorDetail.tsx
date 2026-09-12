import { Detail, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { AppError } from "../types";
import {
  getInvalidUrlMarkdown,
  getConnectionErrorMarkdown,
  getNotFoundMarkdown,
  getDataValidationMarkdown,
  getRateLimitMarkdown,
  accessDeniedMarkdown,
  tokenRequiredMarkdown,
  getPreferencesValidationMarkdown,
} from "../markdown";

interface ErrorDetailProps {
  error: AppError;
}

const createStandardActions = (instanceUrl: string) => (
  <ActionPanel>
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    {instanceUrl && (
      <Action.OpenInBrowser
        title="Open Nightscout Instance"
        url={instanceUrl}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    )}
  </ActionPanel>
);

export function ErrorDetail({ error }: ErrorDetailProps) {
  const getErrorMarkdown = () => {
    switch (error.type) {
      case "invalid-url":
        return getInvalidUrlMarkdown(error.instanceUrl || "");
      case "not-found":
        return getNotFoundMarkdown();
      case "unauthorized":
        return error.hasToken ? accessDeniedMarkdown : tokenRequiredMarkdown;
      case "rate-limit":
        return getRateLimitMarkdown();
      case "data-validation":
        return getDataValidationMarkdown();
      case "preferences-validation":
        return getPreferencesValidationMarkdown(error.details || []);
      case "connection":
      default:
        return getConnectionErrorMarkdown(error.message);
    }
  };

  return <Detail markdown={getErrorMarkdown()} actions={createStandardActions(error.instanceUrl || "")} />;
}
