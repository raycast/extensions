import { List, ActionPanel, Action, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { JSX } from "react";
import { CliPathErrorType, PassCliError, PassCliErrorType, PROTON_PASS_CLI_DOCS } from "./types";
import { clearCliCache, outdatedCliVersion } from "./cli";
import { MIN_PASS_CLI_VERSION } from "./core/cli-version";
import { NotLoggedInView } from "./login-view";
import { SessionLockedView } from "./session-lock-view";

function ClearCliCacheAction({ onComplete }: { onComplete?: () => void }): JSX.Element {
  const handle = async () => {
    try {
      await clearCliCache();
      await showToast({
        style: Toast.Style.Success,
        title: "CLI Cache Cleared",
        message: "The CLI will be re-downloaded on next use",
      });
      onComplete?.();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Cache",
      });
    }
  };
  return <Action title="Clear CLI Cache" icon={Icon.Trash} onAction={handle} />;
}

interface ErrorViewProps {
  errorType: PassCliErrorType;
  onRetry?: () => void;
  contextTitle?: string;
  /** Shown for errors without a dedicated description, so pass-cli's reason isn't lost. */
  message?: string;
}

interface ErrorConfig {
  icon: Icon;
  title: string;
  description: string;
  showDocsLink: boolean;
  showRetry: boolean;
}

function getErrorConfig(errorType: PassCliErrorType, contextTitle?: string, message?: string): ErrorConfig {
  switch (errorType) {
    case "unsupported_platform":
      return {
        icon: Icon.XMarkCircle,
        title: "Unsupported Platform",
        description: `Proton Pass supports macOS arm64/x64 and Windows x64. Current platform: ${process.platform}-${process.arch}.`,
        showDocsLink: false,
        showRetry: false,
      };
    case "not_authenticated":
      return {
        icon: Icon.Lock,
        title: "Not Logged In",
        description: "Run 'pass-cli login' (web login) to authenticate",
        showDocsLink: true,
        showRetry: false,
      };
    case "session_locked":
      return {
        icon: Icon.Lock,
        title: "Session Locked",
        description: "Your pass-cli session is locked. Unlock it, then try again.",
        showDocsLink: false,
        showRetry: true,
      };
    case "keyring_error":
      return {
        icon: Icon.Key,
        title: "Keyring Access Failed",
        description:
          "pass-cli could not access secure key storage. Try: pass-cli logout --force, then set PROTON_PASS_KEY_PROVIDER=fs and login again.",
        showDocsLink: true,
        showRetry: true,
      };
    case "network_error":
      return {
        icon: Icon.Wifi,
        title: "Network Error",
        description: "Check your internet connection and try again",
        showDocsLink: false,
        showRetry: true,
      };
    case "timeout":
      return {
        icon: Icon.Clock,
        title: "Request Timed Out",
        description: "pass-cli took too long to respond. Please try again.",
        showDocsLink: false,
        showRetry: true,
      };
    default:
      return {
        icon: Icon.ExclamationMark,
        title: contextTitle ? `Failed to ${contextTitle}` : "An Error Occurred",
        description: message || "An error occurred. Please try again.",
        showDocsLink: true,
        showRetry: true,
      };
  }
}

function cliPathScreen(errorType: CliPathErrorType): { title: string; description: string } {
  switch (errorType) {
    case "outdated_cli":
      return {
        title: "Proton Pass CLI Out of Date",
        description: `pass-cli ${outdatedCliVersion()} is too old: Proton Pass needs ${MIN_PASS_CLI_VERSION} or later. Update it, or set CLI Path back to pass-cli.`,
      };
    case "unrunnable_cli":
      return {
        title: "Proton Pass CLI Can't Run",
        description: "The file at CLI Path can't run. Fix the path, or set it back to pass-cli.",
      };
    case "not_installed":
      return {
        title: "Proton Pass CLI Not Found",
        description: "Nothing at CLI Path. Fix the path, or set it back to pass-cli.",
      };
  }
}

/**
 * pass-cli missing, too old or unable to run at CLI Path. The extension installs its own pass-cli, so this happens only
 * when CLI Path points elsewhere: the preferences are where it's fixed.
 */
export function CliPathErrorView({ errorType }: { errorType: CliPathErrorType }) {
  const { title, description } = cliPathScreen(errorType);
  return (
    <List>
      <List.EmptyView
        icon={Icon.XMarkCircle}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open Installation Guide" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function ErrorListView({ errorType, onRetry, contextTitle, message }: ErrorViewProps) {
  if (PassCliError.isCliPath(errorType)) return <CliPathErrorView errorType={errorType} />;
  const config = getErrorConfig(errorType, contextTitle, message);

  return (
    <List>
      <List.EmptyView
        icon={config.icon}
        title={config.title}
        description={config.description}
        actions={
          <ActionPanel>
            {config.showRetry && onRetry && <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />}
            {config.showDocsLink && (
              <Action.OpenInBrowser title="View Documentation" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
            )}
            <ClearCliCacheAction onComplete={onRetry} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function renderErrorView(
  errorType: PassCliErrorType | null,
  onRetry?: () => void,
  contextTitle?: string,
  message?: string,
): JSX.Element | null {
  if (!errorType) return null;
  // The login screen, rather than a message: it can log in, and follow a login started before.
  if (errorType === "not_authenticated" && onRetry) return <NotLoggedInView reload={onRetry} />;
  // The code is typed there, and the view loads again once unlocked.
  if (errorType === "session_locked" && onRetry) return <SessionLockedView reload={onRetry} />;
  return <ErrorListView errorType={errorType} onRetry={onRetry} contextTitle={contextTitle} message={message} />;
}
