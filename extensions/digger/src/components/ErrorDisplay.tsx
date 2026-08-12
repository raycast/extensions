import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { ErrorType, FetchError } from "../types";
import { buildErrorReport, getErrorTitle } from "../utils/errorReport";

interface ErrorDisplayProps {
  error: string;
  errorType: ErrorType | null;
  fetchErrors: FetchError[];
  onRetry: () => void;
  /** The URL that failed. Included in the copied detail — an error report that
   *  omits what was being dug is most of the way to useless. */
  url?: string;
}

/** Get icon and color based on error type */
function getErrorIcon(errorType: ErrorType | null): { icon: Icon; color: Color } {
  switch (errorType) {
    case "network":
      // WifiDisabled (the slashed glyph), not Wifi. At empty-state size a
      // full-strength wifi symbol reads as "connected" — the opposite of what
      // just happened. Same call karakeep's ConnectionErrorView makes.
      return { icon: Icon.WifiDisabled, color: Color.Orange };
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

/**
 * Shown in place of the results list when a dig fails outright.
 *
 * `List.EmptyView`, not a `List.Item`: a failure is not a RESULT. Rendering it
 * as a row put a selectable, truncated "Connection Fa… | Unable to con…" entry
 * in the sidebar, duplicating the detail pane beside it and implying there was a
 * list of things to pick from. The empty state is the honest shape.
 *
 * Modelled on karakeep's ConnectionErrorView. The partial-failure case is
 * different and stays a row — see PartialErrorBanner below.
 */
export function ErrorDisplay({ error, errorType, fetchErrors, onRetry, url }: ErrorDisplayProps) {
  const { icon, color } = getErrorIcon(errorType);
  const title = getErrorTitle(errorType);
  const isRecoverable = fetchErrors.length === 0 || fetchErrors.some((e) => e.recoverable);

  // Built by the shared reporter, so this and the toast's Copy Error yield
  // byte-identical text. EmptyView collapses blank lines and truncates after
  // ~3, so the suggestions and the underlying cause cannot render on screen;
  // a longer description just produces a dangling "…" that reads like a
  // rendering bug. They live in the copied report instead.
  // FetchError already carries `description` and `message`, so it satisfies the
  // cause shape structurally — no mapping needed.
  const detail = buildErrorReport({ errorType, message: error, url, causes: fetchErrors });

  return (
    <List.EmptyView
      icon={{ source: icon, tintColor: color }}
      title={title}
      description={error}
      actions={
        <ActionPanel>
          {isRecoverable && (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Error Details"
            content={detail}
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
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
  const errorDetails = fetchErrors.map((e) => `${e.description}: ${e.message}`).join("\n");

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
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard
            title="Copy Error Details"
            content={errorDetails}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
