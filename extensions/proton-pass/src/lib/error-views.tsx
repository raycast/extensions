import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { JSX } from "react";
import { PassCliErrorType, PROTON_PASS_CLI_DOCS } from "./types";
import { clearCliCache } from "./cli";

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
}

interface ErrorConfig {
  icon: Icon;
  title: string;
  description: string;
  showDocsLink: boolean;
  showRetry: boolean;
}

function getErrorConfig(errorType: PassCliErrorType, contextTitle?: string): ErrorConfig {
  switch (errorType) {
    case "not_installed":
      return {
        icon: Icon.XMarkCircle,
        title: "Proton Pass CLI Not Installed",
        description:
          "You need to install the Proton Pass CLI to use this extension. Click below to learn how to install it.",
        showDocsLink: true,
        showRetry: false,
      };
    case "not_authenticated":
      return {
        icon: Icon.Lock,
        title: "Not Logged In",
        description: "Run 'pass-cli login' in terminal to authenticate",
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
        description: "An error occurred. Please try again.",
        showDocsLink: true,
        showRetry: true,
      };
  }
}

export function ErrorListView({ errorType, onRetry, contextTitle }: ErrorViewProps) {
  const config = getErrorConfig(errorType, contextTitle);

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
): JSX.Element | null {
  if (!errorType) return null;
  return <ErrorListView errorType={errorType} onRetry={onRetry} contextTitle={contextTitle} />;
}
