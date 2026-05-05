import { List, Icon, Color, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { detectGcloudPath, getInstallInstructions, getPlatform } from "./utils/gcloudDetect";
import { CacheManager } from "./utils/CacheManager";
import DoctorView from "./components/DoctorView";
import { ConfigurationsView } from "./services/configurations";
import { revokeAllAuth } from "./services/configurations/ConfigurationsService";

// Raycast resolves this file as the entrypoint for the `configurations` command in package.json.

export default function ConfigurationsCommand() {
  const configuredGcloudPath = getPreferenceValues<Preferences>().gcloudPath;
  const [gcloudPath, setGcloudPath] = useState<string>(configuredGcloudPath || "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    detectPath();
  }, []);

  async function detectPath() {
    let pathToUse = configuredGcloudPath;
    if (!pathToUse) {
      const detected = await detectGcloudPath();
      if (detected) {
        pathToUse = detected;
      }
    }
    if (!pathToUse) {
      const instructions = getInstallInstructions();
      const platform = getPlatform();
      const message =
        platform === "macos"
          ? `Install via: ${instructions.command}`
          : platform === "windows"
            ? "Download from cloud.google.com/sdk/docs/install"
            : `Install via: ${instructions.command}`;
      setError(`Google Cloud SDK not found. ${message}`);
      setIsLoading(false);
      return;
    }
    setGcloudPath(pathToUse);
    setIsLoading(false);
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Google Cloud SDK not found"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      </List>
    );
  }

  return (
    <ConfigurationsView
      gcloudPath={gcloudPath}
      onSwitchAccount={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Logging out..." });
        try {
          await revokeAllAuth(gcloudPath);
          CacheManager.clearAuthCache();
          CacheManager.clearProjectCache();
          toast.style = Toast.Style.Success;
          toast.title = "Logged out. Re-authenticate from the main Google Cloud command.";
        } catch {
          toast.style = Toast.Style.Failure;
          toast.title = "Logout failed";
        }
      }}
      onClearCache={() => {
        CacheManager.clearAllCaches();
        CacheManager.clearRecentResources();
        showToast({ style: Toast.Style.Success, title: "Cache cleared" });
      }}
      onDoctor={() => push(<DoctorView configuredPath={configuredGcloudPath} />)}
      onRefreshAll={() =>
        showToast({ style: Toast.Style.Success, title: "Refresh triggered — open the main command to reload counts" })
      }
    />
  );
}
