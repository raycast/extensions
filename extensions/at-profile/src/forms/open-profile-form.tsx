import { Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { getAllApps, getProfileHistory, getAppFavicon } from "../hooks/apps";
import { openProfile } from "../utils/open-profile";
import { App, OpenProfileFormProps } from "../types";
import OpenActionPanels from "../components/OpenActionPanels";

export default function OpenProfileForm({ initialProfile, initialApp }: OpenProfileFormProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>(initialApp || "");
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [profileHistory, setProfileHistory] = useState<string[]>([]);
  const [profileValue, setProfileValue] = useState<string>(initialProfile || "");
  const [selectedRecentProfile, setSelectedRecentProfile] = useState<string>("");

  useEffect(() => {
    async function loadApps() {
      setIsLoadingApps(true);
      try {
        const allApps = await getAllApps();
        setApps(allApps);

        // Load profile history for autocomplete
        const history = await getProfileHistory();
        setProfileHistory(history);

        if (allApps.length === 0) {
          await showFailureToast("No apps are enabled. Please enable apps in Manage Apps first.", {
            title: "No Apps Available",
          });
          setIsLoadingApps(false);
          return;
        }

        // Set initial app if provided and valid
        if (initialApp) {
          const foundApp = allApps.find(
            (app) =>
              app.value.toLowerCase() === initialApp.toLowerCase() ||
              app.name.toLowerCase() === initialApp.toLowerCase(),
          );
          if (foundApp) {
            setSelectedApp(foundApp.value);
          } else {
            setSelectedApp(allApps[0].value);
          }
        } else {
          setSelectedApp(allApps[0].value);
        }
      } catch (error) {
        await showFailureToast("Failed to load enabled social apps", { title: "Error loading apps" });
      } finally {
        setIsLoadingApps(false);
      }
    }

    loadApps();
  }, [initialApp]);

  // Separate effect to handle initialApp changes after apps are loaded
  useEffect(() => {
    if (initialApp && apps.length > 0) {
      const foundApp = apps.find(
        (app) =>
          app.value.toLowerCase() === initialApp.toLowerCase() || app.name.toLowerCase() === initialApp.toLowerCase(),
      );
      if (foundApp) {
        setSelectedApp(foundApp.value);
      }
    }
  }, [initialApp, apps]);

  const handleFormSubmit = async (values: { profile: string; app: string }) => {
    if (apps.length === 0) {
      await showFailureToast("Please enable apps in Manage Apps first", { title: "No apps enabled" });
      return;
    }

    // Use the controlled profile value instead of form value
    const profileToUse = profileValue.trim() || values.profile.trim();

    if (!profileToUse || !values.app) {
      await showFailureToast("Please enter a profile and select an app", { title: "Invalid input" });
      return;
    }

    await openProfile(profileToUse, values.app);
  };

  return (
    <Form
      isLoading={isLoadingApps}
      actions={
        <OpenActionPanels onSubmit={handleFormSubmit} />
      }
    >
      <Form.TextField
        id="profile"
        title="Profile"
        placeholder="Enter profile (with or without @)"
        info="The profile name to open (@ symbol is optional)"
        value={profileValue}
        onChange={(newValue) => {
          setProfileValue(newValue);
          // Check if the new value matches a recent profile
          const matchingProfile = profileHistory.find(
            (profile) => profile.toLowerCase() === newValue.toLowerCase()
          );
          setSelectedRecentProfile(matchingProfile || "");
        }}
        onBlur={() => {
          // If profile is empty and we have history, auto-select the first profile
          if (!profileValue.trim() && profileHistory.length > 0) {
            const firstProfile = profileHistory[0];
            setProfileValue(firstProfile);
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
              setProfileValue(selectedProfile);
              setSelectedRecentProfile(selectedProfile);
            } else {
              // User selected the "Select a recent profile..." option
              setSelectedRecentProfile("");
            }
          }}
          info="Select from recently used profiles or use ↑/↓ to navigate"
        >
          <Form.Dropdown.Item value="" title="Select a recent profile..." />
          {profileHistory.slice(0, 10).map((profile, index) => (
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
          value={selectedApp}
          onChange={setSelectedApp}
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
