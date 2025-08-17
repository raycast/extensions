import { ActionPanel, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AppDetails } from "../types";
import { downloadScreenshots } from "../utils/screenshot-downloader";
import { getAppStoreUrl } from "../utils/constants";
import { useAppDownload } from "../hooks/use-app-download";
import { useAuthNavigation } from "../hooks/useAuthNavigation";

interface AppActionsProps {
  app: AppDetails;
  onDownload?: (app: AppDetails) => Promise<string | null | undefined>;
  onDownloadScreenshots?: (app: AppDetails) => Promise<string | null | undefined>;
}

/**
 * Reusable component for app-related actions
 */
export function AppActions({ app, onDownload, onDownloadScreenshots }: AppActionsProps) {
  // Create a fallback App Store URL if trackViewUrl is not available
  const appStoreUrl = app.trackViewUrl || (app.id ? getAppStoreUrl(app.id) : undefined);

  // Auth-aware download helpers
  const authNavigation = useAuthNavigation();
  const { downloadApp: downloadWithAuth } = useAppDownload(authNavigation);

  // Default download handler if none provided
  const handleDownload = async () => {
    try {
      if (onDownload) {
        return await onDownload(app);
      }

      // Fall back to auth-aware download via hook if no handler provided
      return await downloadWithAuth(app.bundleId, app.name, app.version, app.price);
    } catch (error) {
      console.error("Error downloading app:", error);
      showFailureToast({ title: "Error downloading app", message: String(error) });
      return null;
    }
  };

  const handleDownloadScreenshots = async () => {
    try {
      if (onDownloadScreenshots) {
        return await onDownloadScreenshots(app);
      }

      // Fall back to direct download if no handler provided
      return await downloadScreenshots(app.bundleId, app.name, app.version);
    } catch (error) {
      console.error("Error downloading screenshots:", error);
      showFailureToast({ title: "Error downloading screenshots", message: String(error) });
      return null;
    }
  };

  return (
    <ActionPanel.Section title="App Actions">
      <Action
        title="Download App"
        icon={Icon.Download}
        onAction={handleDownload}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
      <Action
        title="Download Screenshots"
        icon={Icon.Image}
        onAction={handleDownloadScreenshots}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      {appStoreUrl && (
        <Action.OpenInBrowser
          title="View in App Store"
          icon={Icon.AppWindow}
          url={appStoreUrl}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      {app.artistViewUrl && <Action.OpenInBrowser title="View Developer" icon={Icon.Person} url={app.artistViewUrl} />}
    </ActionPanel.Section>
  );
}
