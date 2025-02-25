import { List, showToast, Toast, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { OAuthManager } from "./services/auth/OAuthManager";
import { Icon } from "@raycast/api";
import { CameraList } from "./components/CameraList";
import { NestCamera } from "./types";
import { NestDeviceService } from "./services/camera/NestDeviceService";

export default function Command() {
  const [cameras, setCameras] = useState<NestCamera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsConfiguration, setNeedsConfiguration] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authManager = OAuthManager.getInstance();
        // Check if we have a valid token
        try {
          await authManager.getValidToken();
          setIsAuthenticated(true);
        } catch (e) {
          setIsAuthenticated(false);
        }

        // Check if configuration is valid
        const config = getPreferenceValues();
        if (!config.clientId || !config.projectId) {
          setNeedsConfiguration(true);
          setIsLoading(false);
          return;
        }

        if (isAuthenticated) {
          await fetchCameras();
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth check error:", e);
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: e instanceof Error ? e.message : "Unknown error",
        });
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      // Cleanup
      const deviceService = NestDeviceService.getInstance();
      deviceService.cleanup();
    };
  }, [isAuthenticated]);

  const fetchCameras = async () => {
    setIsLoading(true);
    try {
      const deviceService = NestDeviceService.getInstance();
      const cameraList = await deviceService.listCameras();
      setCameras(cameraList);
    } catch (e) {
      console.error("Error fetching cameras:", e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch cameras",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStream = async (camera: NestCamera) => {
    try {
      const deviceService = NestDeviceService.getInstance();
      await deviceService.openStream(camera.id);
    } catch (error) {
      console.error("Error opening stream:", error);
      throw error;
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const authManager = OAuthManager.getInstance();
      // Get a valid token which will trigger the OAuth flow if needed
      await authManager.getValidToken();
      setIsAuthenticated(true);
      await fetchCameras();
    } catch (e) {
      console.error("Sign in error:", e);
      showToast({
        style: Toast.Style.Failure,
        title: "Sign In Error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
      setIsLoading(false);
    }
  };

  // Filter cameras based on streaming support
  const filteredCameras = cameras.filter(
    (camera) => camera.traits.streamingSupport === "RTSP" || camera.traits.streamingSupport === "WEB_RTC"
  );

  // If not authenticated, show sign in view
  if (!isAuthenticated) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Sign in to Nest"
          description="You need to sign in to your Google account to access your Nest cameras."
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action title="Sign In" icon={Icon.Person} onAction={handleSignIn} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // If needs configuration, show configuration view
  if (needsConfiguration) {
    return (
      <List>
        <List.EmptyView
          title="Configuration Required"
          description="Please set your Client ID and Project ID in the extension preferences."
          icon={Icon.Gear}
        />
      </List>
    );
  }

  // If authenticated, show camera list
  return <CameraList cameras={filteredCameras} isLoading={isLoading} onOpenStream={handleOpenStream} />;
}
