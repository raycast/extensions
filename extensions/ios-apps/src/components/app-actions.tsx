import { ActionPanel, Action, Icon } from "@raycast/api";
import { AppDetails } from "../types";
import { downloadIPA } from "../ipatool";
import { downloadScreenshots } from "../utils/itunes-api";

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
  const appStoreUrl = app.trackViewUrl || (app.id ? `https://apps.apple.com/app/id${app.id}` : undefined);

  // Default download handler if none provided
  const handleDownload = async () => {
    try {
      if (onDownload) {
        return await onDownload(app);
      }

      // Fall back to direct download if no handler provided
      return await downloadIPA(app.bundleId, app.name, app.version, app.price);
    } catch (error) {
      console.error("Error downloading app:", error);
      throw error;
    }
  };

  const handleDownloadScreenshots = async () => {
    try {
      if (onDownloadScreenshots) {
        return await onDownloadScreenshots(app);
      }

      // Fall back to direct download if no handler provided
      return await downloadScreenshots(app.bundleId, app.name, app.version, app.price);
    } catch (error) {
      console.error("Error downloading screenshots:", error);
      throw error;
    }
  };

  return (
    <ActionPanel.Section title="App Actions">
      <Action title="Download App" icon={Icon.Download} onAction={handleDownload} />
      <Action title="Download Screenshots" icon={Icon.Image} onAction={handleDownloadScreenshots} />
      {appStoreUrl && <Action.OpenInBrowser title="View in App Store" icon={Icon.AppWindow} url={appStoreUrl} />}
      {app.artistViewUrl && <Action.OpenInBrowser title="View Developer" icon={Icon.Person} url={app.artistViewUrl} />}
    </ActionPanel.Section>
  );
}
