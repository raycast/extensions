import { List, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { OAuthManager } from "./services/auth/OAuthManager";
import { ConfigurationError } from "./utils/config";
import { Icon } from "@raycast/api";
import { CameraList } from "./components/CameraList";
import { NestCamera } from "./types";
import { NestDeviceService } from "./services/camera/NestDeviceService";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cameras, setCameras] = useState<NestCamera[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadCameras = useCallback(async () => {
    try {
      const deviceService = NestDeviceService.getInstance();
      const cameraList = await deviceService.listCameras();
      setCameras(cameraList);
    } catch (error) {
      console.error("Failed to load cameras:", error);
      if (error instanceof Error) {
        setError(error);
        if (!error.message.includes('Rate limited')) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load cameras",
            message: error.message,
          });
        }
      }
    }
  }, []);

  const authenticate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authManager = OAuthManager.getInstance();
      await authManager.getValidToken();
      setIsAuthenticated(true);
      
      // Only load cameras on initial authentication
      if (isInitialLoad) {
        await loadCameras();
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Authentication error in component:", error);
      setError(error as Error);
      setIsAuthenticated(false);

      if (error instanceof ConfigurationError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: "Please check your Google Nest credentials in extension preferences",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isInitialLoad, loadCameras]);

  useEffect(() => {
    authenticate();

    // Start camera monitoring only after initial load
    let stopMonitoring: (() => void) | undefined;
    if (isAuthenticated && !isInitialLoad) {
      const deviceService = NestDeviceService.getInstance();
      deviceService.startCameraMonitoring(
        (camera) => {
          setCameras(prev => {
            const index = prev.findIndex(c => c.id === camera.id);
            if (index === -1) return [...prev, camera];
            const updated = [...prev];
            updated[index] = camera;
            return updated;
          });
        },
        (error) => {
          console.error("Camera monitoring error:", error);
          if (!error.message.includes('Rate limited')) {
            showToast({
              style: Toast.Style.Failure,
              title: "Camera Monitoring Error",
              message: error.message,
            });
          }
        }
      ).then(cleanup => {
        stopMonitoring = cleanup;
      });
    }

    return () => {
      if (stopMonitoring) {
        stopMonitoring();
      }
      const deviceService = NestDeviceService.getInstance();
      deviceService.cleanup();
    };
  }, [authenticate, isAuthenticated, isInitialLoad]);

  const handleAuthClick = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await OAuthManager.getInstance().clearTokens();
      await authenticate();
    } catch (error) {
      console.error("Failed to authenticate:", error);
    }
  }, [authenticate]);

  if (error instanceof ConfigurationError) {
    return (
      <List>
        <List.EmptyView
          title="Configuration Required"
          description="Please set up your Google Nest credentials in the extension preferences"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Device Access Console"
                url="https://console.nest.google.com/device-access"
              />
              <Action.OpenInBrowser
                title="Open Cloud Console"
                url="https://console.cloud.google.com/apis/credentials"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isAuthenticated) {
    return (
      <List>
        <List.EmptyView
          title="Authentication Required"
          description="Please sign in to your Google Nest account"
          actions={
            <ActionPanel>
              <Action
                title="Sign In"
                onAction={handleAuthClick}
                icon={Icon.Link}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <CameraList cameras={cameras} isLoading={isLoading} />;
} 