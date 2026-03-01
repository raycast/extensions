import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { isAuthenticated, authorize, logout } from "./withings-api";
import { clearGarminSession } from "./garmin-api";

export default function Configure() {
  const [withingsAuth, setWithingsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const isAuth = await isAuthenticated();
      setWithingsAuth(isAuth);
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthorize() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Authorizing with Withings...",
      });

      await authorize();

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully authorized!",
      });

      setWithingsAuth(true);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authorization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleLogout() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging out...",
      });

      await logout();
      await clearGarminSession();

      await showToast({
        style: Toast.Style.Success,
        title: "Logged out successfully",
      });

      setWithingsAuth(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const withingsStatus = withingsAuth ? "✅ Connected" : "❌ Not Connected";
  const garminStatus =
    prefs.garminUsername && prefs.garminPassword
      ? "✅ Credentials Configured"
      : "❌ Not Configured";
  const bloodPressureStatus = prefs.includeBloodPressure
    ? "✅ Enabled"
    : "❌ Disabled";

  const markdown = `
# Withings Sync Configuration

## Withings Authentication
**Status:** ${withingsStatus}

${withingsAuth ? "You are connected to Withings and can view your measurements." : "You need to authorize Raycast to access your Withings data."}

## Garmin Connect
**Status:** ${garminStatus}

${prefs.garminUsername && prefs.garminPassword ? `**Username:** ${prefs.garminUsername}` : "Configure your Garmin credentials in preferences (⌘ + ,)"}

## Blood Pressure Sync
**Status:** ${bloodPressureStatus}

${prefs.includeBloodPressure ? "Blood pressure measurements will be included when syncing to Garmin." : "Blood pressure measurements will not be synced to Garmin."}

---

## How to Use

1. **Connect Withings**: Click "Authorize Withings" below
2. **Configure Garmin**: Press ⌘ + , to open preferences and enter your Garmin credentials
3. **View Measurements**: Use "View Withings Measurements" command
4. **Sync to Garmin**: Use "Sync to Garmin" command to upload your data

## Features

- ✅ View recent weight measurements
- ✅ View blood pressure readings
- ✅ Sync to Garmin Connect
- ✅ Automatic token refresh
- ✅ Secure credential storage

## Data Types Supported

- Weight
- Body Fat Percentage
- Fat-Free Mass
- Blood Pressure (Systolic/Diastolic)
- Heart Rate
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!withingsAuth ? (
            <Action
              title="Authorize Withings"
              onAction={handleAuthorize}
              icon={Icon.Key}
            />
          ) : (
            <Action
              title="Disconnect Withings"
              onAction={handleLogout}
              icon={Icon.Logout}
              style={Action.Style.Destructive}
            />
          )}
          <Action.Open
            title="Open Preferences"
            target="raycast://extensions/preferences"
            icon={Icon.Gear}
          />
          <Action.OpenInBrowser
            title="Open Withings Account"
            url="https://account.withings.com"
            icon={Icon.Link}
          />
          <Action.OpenInBrowser
            title="Open Garmin Connect"
            url="https://connect.garmin.com"
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    />
  );
}
