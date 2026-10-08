import React, { useState, useEffect, useCallback } from "react";
import { MenuBarExtra, getPreferenceValues, showToast, Toast, Color, Icon } from "@raycast/api";
import { LuxaforService, LuxaforColor } from "./luxafor-service";
import { luxaforState, DeviceStatus } from "./luxafor-state";
import { showFailureToast } from "@raycast/utils";

export default function LuxaforStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DeviceStatus>({
    isOnline: false,
    currentColor: "unknown",
    lastSeen: null,
    lastAction: "",
  });

  const preferences = getPreferenceValues<Preferences>();
  const luxaforService = new LuxaforService(preferences);

  // Memoized color change handler to prevent unnecessary re-renders
  const handleColorChange = useCallback(
    async (newColor: LuxaforColor) => {
      if (!preferences.userId) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please set your Luxafor User ID in preferences",
        });
        return;
      }

      if (isLoading) return;

      setIsLoading(true);
      try {
        const result = await luxaforService.setSolidColor(newColor);
        if (result.success) {
          showToast({
            style: Toast.Style.Success,
            title: `Success: Changed to ${newColor}`,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: result.error || "Failed to change color",
          });
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to change color" });
      } finally {
        setIsLoading(false);
      }
    },
    [preferences.userId, isLoading, luxaforService],
  );

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = luxaforState.subscribe((status) => {
      setCurrentStatus(status);
    });

    // Initialize with current state
    const initializeState = async () => {
      await luxaforState.waitForInitialization();
      const status = luxaforState.getStatus();
      setCurrentStatus(status);
    };

    initializeState();

    return unsubscribe;
  }, []);

  // Background refresh logic
  useEffect(() => {
    if (!preferences.debugMode) {
      // In production mode, use efficient polling
      const interval = setInterval(async () => {
        try {
          const status = luxaforState.getStatus();
          setCurrentStatus(status);
        } catch {
          // Silent error handling in production
        }
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    } else {
      // Development mode - more frequent updates for debugging
      const interval = setInterval(async () => {
        try {
          const status = luxaforState.getStatus();
          setCurrentStatus(status);
        } catch {
          // Development error handling
        }
      }, 5000); // 5 seconds

      return () => clearInterval(interval);
    }
  }, [preferences.debugMode]);

  // Optimized toggle function
  const toggleColor = useCallback(async () => {
    if (!preferences.userId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please set your Luxafor User ID in preferences",
      });
      return;
    }

    if (isLoading) return;

    const newColor = currentStatus.currentColor === "red" ? "green" : "red";
    await handleColorChange(newColor);
  }, [preferences.userId, isLoading, currentStatus.currentColor, handleColorChange]);

  const getStatusIcon = () => {
    if (!preferences.userId) return Icon.QuestionMark;
    if (isLoading) return Icon.Clock;
    return Icon.Circle;
  };

  const getStatusColor = () => {
    if (!preferences.userId) return Color.SecondaryText;
    if (isLoading) return Color.Blue;

    switch (currentStatus.currentColor) {
      case "red":
        return Color.Red;
      case "green":
        return Color.Green;
      case "blue":
        return Color.Blue;
      case "yellow":
        return Color.Yellow;
      case "cyan":
        return Color.Blue;
      case "magenta":
        return Color.Purple;
      case "white":
        return Color.PrimaryText;
      case "off":
        return Color.SecondaryText;

      default:
        return Color.SecondaryText;
    }
  };

  const getToggleTarget = () => {
    if (currentStatus.currentColor === "red") return "Green";
    if (currentStatus.currentColor === "green") return "Red";
    return "Red";
  };

  const renderSimpleMode = () => (
    <>
      <MenuBarExtra.Section
        title={`Currently ${currentStatus.currentColor.charAt(0).toUpperCase() + currentStatus.currentColor.slice(1)}`}
      />
      <MenuBarExtra.Item
        title={`Toggle to ${getToggleTarget()}`}
        icon={{ source: Icon.Circle, tintColor: getToggleTarget() === "Green" ? Color.Green : Color.Red }}
        onAction={toggleColor}
      />
      <MenuBarExtra.Section title="Status" />
      <MenuBarExtra.Item
        title={`Status: ${currentStatus.isOnline ? "Online" : "Offline"}`}
        icon={{
          source: currentStatus.isOnline ? Icon.Wifi : Icon.XmarkCircle,
          tintColor: currentStatus.isOnline ? Color.Green : Color.Red,
        }}
      />
    </>
  );

  const renderFullMode = () => (
    <>
      <MenuBarExtra.Section
        title={`Currently ${currentStatus.currentColor.charAt(0).toUpperCase() + currentStatus.currentColor.slice(1)}`}
      />

      <MenuBarExtra.Item
        title="Red"
        icon={{ source: Icon.Circle, tintColor: Color.Red }}
        onAction={() => handleColorChange("red")}
      />
      <MenuBarExtra.Item
        title="Green"
        icon={{ source: Icon.Circle, tintColor: Color.Green }}
        onAction={() => handleColorChange("green")}
      />
      <MenuBarExtra.Item
        title="Blue"
        icon={{ source: Icon.Circle, tintColor: Color.Blue }}
        onAction={() => handleColorChange("blue")}
      />
      <MenuBarExtra.Item
        title="Yellow"
        icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
        onAction={() => handleColorChange("yellow")}
      />

      <MenuBarExtra.Item
        title="Cyan"
        icon={{ source: Icon.Circle, tintColor: Color.Blue }}
        onAction={() => handleColorChange("cyan")}
      />

      <MenuBarExtra.Item
        title="Magenta"
        icon={{ source: Icon.Circle, tintColor: Color.Purple }}
        onAction={() => handleColorChange("magenta")}
      />

      <MenuBarExtra.Item
        title="White"
        icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
        onAction={() => handleColorChange("white")}
      />

      <MenuBarExtra.Section title="" />

      <MenuBarExtra.Item
        title="Turn Off"
        icon={{ source: Icon.Power, tintColor: Color.SecondaryText }}
        onAction={async () => {
          if (!preferences.userId) {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Please set your Luxafor User ID in preferences",
            });
            return;
          }
          setIsLoading(true);
          try {
            const result = await luxaforService.turnOff();
            if (result.success) {
              showToast({
                style: Toast.Style.Success,
                title: "Success",
                message: "Turned off",
              });
            } else {
              showToast({
                style: Toast.Style.Failure,
                title: "Error",
                message: result.error || "Failed to turn off",
              });
            }
          } catch (error) {
            showFailureToast(error, { title: "Failed to turn off" });
          } finally {
            setIsLoading(false);
          }
        }}
      />
      <MenuBarExtra.Section title="Status" />
      <MenuBarExtra.Item
        title={`Status: ${currentStatus.isOnline ? "Online" : "Offline"}`}
        icon={{
          source: currentStatus.isOnline ? Icon.Wifi : Icon.XmarkCircle,
          tintColor: currentStatus.isOnline ? Color.Green : Color.Red,
        }}
      />
    </>
  );

  return (
    <MenuBarExtra icon={{ source: getStatusIcon(), tintColor: getStatusColor() }} title="" isLoading={isLoading}>
      {isLoading ? null : preferences.menubarMode === "simple" ? renderSimpleMode() : renderFullMode()}
    </MenuBarExtra>
  );
}
