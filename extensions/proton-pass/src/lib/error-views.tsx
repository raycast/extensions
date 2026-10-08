import { List, ActionPanel, Action, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { JSX } from "react";
import { PassCliErrorType, PROTON_PASS_CLI_DOCS } from "./types";
import { clearCliCache } from "./cli";
import { NotLoggedInView } from "./login-view";

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

/**
 * The extension installs its own pass-cli, so pass-cli is missing only when the CLI Path preference points elsewhere:
 * the preferences are where it's fixed.
 */
export function CliNotFoundView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.XMarkCircle}
        title="Proton Pass CLI Not Found"
        description="pass-cli wasn't found at the CLI Path set in the extension preferences. Correct the path, or clear it to use the pass-cli the extension installs. Then open the command again."
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
  if (errorType === "not_installed") return <CliNotFoundView />;
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
  return <ErrorListView errorType={errorType} onRetry={onRetry} contextTitle={contextTitle} message={message} />;
}
