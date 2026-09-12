import { useState, useEffect } from "react";
import { Form } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { getUsageHistory, getAppFavicon } from "../helpers/apps";
import { openProfile } from "../helpers/open-profile";
import { useApps } from "../hooks/useApps";
import { showError } from "../utils/errors";
import { OpenProfileFormProps } from "../types";
import OpenActionPanels from "../components/OpenActionPanels";

export default function OpenProfileForm({ initialProfile, initialApp }: OpenProfileFormProps) {
  const { apps, isLoading: isLoadingApps, revalidate } = useApps();

  const { data: usageHistory = [], isLoading: isLoadingHistory } = useCachedPromise(getUsageHistory, [], {
    keepPreviousData: true,
  });

  // Extract unique profiles from usage history, sorted by most recent
  const profileHistory = usageHistory
    .sort((a, b) => b.timestamp - a.timestamp)
    .reduce((unique: string[], item) => {
      if (!unique.includes(item.profile)) {
        unique.push(item.profile);
      }
      return unique;
    }, []);

  const { value: profileValue, setValue: setProfileValue } = useLocalStorage<string>(
    "lastProfile",
    initialProfile || "",
  );
  const { value: selectedApp, setValue: setSelectedApp } = useLocalStorage<string>("lastSelectedApp", initialApp || "");
  const [selectedRecentProfile, setSelectedRecentProfile] = useState<string>("");

  // Reconcile initialApp with cached selection once apps are available
  // Guard to avoid setting local-storage-backed state on every render
  useEffect(() => {
    if (apps.length === 0) return;

    if (initialApp) {
      const foundApp = apps.find(
        (app) =>
          app.value.toLowerCase() === initialApp.toLowerCase() || app.name.toLowerCase() === initialApp.toLowerCase(),
      );
      if (foundApp && selectedApp !== foundApp.value) {
        setSelectedApp(foundApp.value);
        return;
      }
    }

    // Fallback: if nothing selected yet, default to first app
    if (!selectedApp && apps[0]) {
      setSelectedApp(apps[0].value);
    }
  }, [initialApp, apps]);

  // Notify user if no apps are available after load
  useEffect(() => {
    if (!isLoadingApps && apps.length === 0) {
      showError("No apps are shown. Please show apps in Manage Apps first.", "No Apps Available");
    }
  }, [isLoadingApps, apps]);

  const handleFormSubmit = async (values: { profile: string; app: string }) => {
    if (apps.length === 0) {
      await showError("Please show apps in Manage Apps first", "No apps shown");
      return;
    }

    // Use the controlled profile value instead of form value
    const profileToUse = (profileValue || "").trim() || values.profile.trim();

    if (!profileToUse || !values.app) {
      await showError("Please enter a profile and select an app", "Invalid input");
      return;
    }

    await openProfile(profileToUse, values.app);
  };

  return (
    <Form
      isLoading={isLoadingApps || isLoadingHistory}
      actions={<OpenActionPanels onSubmit={handleFormSubmit} onSave={revalidate} />}
    >
      <Form.TextField
        id="profile"
        title="Profile"
        placeholder="Enter profile (with or without @)"
        info="The profile name to open (@ symbol is optional)"
        value={profileValue || ""}
        onChange={(newValue) => {
          void setProfileValue(newValue);
          // Check if the new value matches a recent profile
          const matchingProfile = profileHistory.find(
            (profile: string) => profile.toLowerCase() === newValue.toLowerCase(),
          );
          setSelectedRecentProfile(matchingProfile || "");
        }}
        onBlur={() => {
          // If profile is empty and we have history, auto-select the first profile
          if (!(profileValue || "").trim() && profileHistory.length > 0) {
            const firstProfile = profileHistory[0];
            void setProfileValue(firstProfile);
            setSelectedRecentProfile(firstProfile);
          }
        }}
      />

      {profileHistory.length > 0 && (
        <Form.Dropdown
          id="recentProfile"
          title="Recent Profiles"
          value={selectedRecentProfile}
          onChange={(selectedProfile) => {
            if (selectedProfile) {
              void setProfileValue(selectedProfile);
              setSelectedRecentProfile(selectedProfile);
            } else {
              // User selected the "Select a recent profile..." option
              setSelectedRecentProfile("");
            }
          }}
          info="Select from recently used profiles or use ↑/↓ to navigate"
        >
          <Form.Dropdown.Item value="" title="Select a recent profile..." />
          {profileHistory.slice(0, 10).map((profile: string, index: number) => (
            <Form.Dropdown.Item
              key={`${profile}-${index}`}
              value={profile}
              title={profile.startsWith("@") ? profile : `@${profile}`}
            />
          ))}
        </Form.Dropdown>
      )}

      {apps.length > 0 && (
        <Form.Dropdown
          id="app"
          title="App"
          value={selectedApp || ""}
          onChange={(val) => void setSelectedApp(val)}
          info="Select the app where you want to open the profile"
        >
          {apps.map((app) => (
            <Form.Dropdown.Item key={app.value} value={app.value} title={app.name} icon={getAppFavicon(app)} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
