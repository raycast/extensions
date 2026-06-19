import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { ErrorType, FetchError } from "../types";

interface ErrorDisplayProps {
  error: string;
  errorType: ErrorType | null;
  fetchErrors: FetchError[];
  onRetry: () => void;
  hasPartialData: boolean;
}

/** Get icon and color based on error type */
function getErrorIcon(errorType: ErrorType | null): { icon: Icon; color: Color } {
  switch (errorType) {
    case "network":
      return { icon: Icon.Wifi, color: Color.Orange };
    case "blocked":
      return { icon: Icon.Shield, color: Color.Red };
    case "notFound":
      return { icon: Icon.QuestionMarkCircle, color: Color.Yellow };
    case "serverError":
      return { icon: Icon.ExclamationMark, color: Color.Red };
    case "invalid":
      return { icon: Icon.XMarkCircle, color: Color.Orange };
    default:
      return { icon: Icon.Warning, color: Color.Red };
  }
}

/** Get helpful suggestions based on error type */
function getErrorSuggestions(errorType: ErrorType | null): string[] {
  switch (errorType) {
    case "network":
      return [
        "Check your internet connection",
        "Verify the URL is spelled correctly",
        "The website may be temporarily down",
        "Try again in a few moments",
      ];
    case "blocked":
      return [
        "The site may have bot protection enabled",
        "You may be rate limited - wait a moment",
        "Try accessing the site in a browser first",
        "Some sites block automated requests",
      ];
    case "notFound":
      return [
        "Double-check the URL for typos",
        "The page may have been moved or deleted",
        "Try the site's homepage instead",
      ];
    case "serverError":
      return [
        "The website is experiencing issues",
        "Try again in a few minutes",
        "Check if the site is down for everyone",
      ];
    case "invalid":
      return [
        "Make sure the URL starts with http:// or https://",
        "Check for special characters in the URL",
        "Try copying the URL directly from your browser",
      ];
    default:
      return ["Try again", "Check the URL and try once more"];
  }
}

/** Get error title based on type */
function getErrorTitle(errorType: ErrorType | null): string {
  switch (errorType) {
    case "network":
      return "Connection Failed";
    case "blocked":
      return "Access Blocked";
    case "notFound":
      return "Page Not Found";
    case "serverError":
      return "Server Error";
    case "invalid":
      return "Invalid URL";
    default:
      return "Fetch Error";
  }
}

export function ErrorDisplay({ error, errorType, fetchErrors, onRetry, hasPartialData }: ErrorDisplayProps) {
  const { icon, color } = getErrorIcon(errorType);
  const title = getErrorTitle(errorType);
  const suggestions = getErrorSuggestions(errorType);
  const isRecoverable = fetchErrors.length === 0 || fetchErrors.some((e) => e.recoverable);

  const detailMarkdown = `
# ${title}

${error}

## Suggestions

${suggestions.map((s) => `- ${s}`).join("\n")}

${
  fetchErrors.length > 0
    ? `
## Failed Components

${fetchErrors.map((e) => `- **${e.description}**: ${e.message}`).join("\n")}
`
    : ""
}

${hasPartialData ? "\n---\n*Some data was retrieved successfully. Scroll down to see partial results.*" : ""}
`;

  return (
    <List.Item
      title={title}
      subtitle={error}
      icon={{ source: icon, tintColor: color }}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <ActionPanel>
          {isRecoverable && (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Error Message"
            content={error}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface PartialErrorBannerProps {
  fetchErrors: FetchError[];
  onRetry: () => void;
}

export function PartialErrorBanner({ fetchErrors, onRetry }: PartialErrorBannerProps) {
  if (fetchErrors.length === 0) return null;

  const failedCategories = fetchErrors.map((e) => e.description).join(", ");

  return (
    <List.Item
      title="Some data couldn't be loaded"
      subtitle={failedCategories}
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
      accessories={[{ text: `${fetchErrors.length} failed`, icon: Icon.Warning }]}
      actions={
        <ActionPanel>
          <Action
            title="Retry All"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
