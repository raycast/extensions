import { showError } from "@chrismessina/raycast-kit";
import { useEffect, useRef, useState } from "react";
import { Form } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import OpenActionPanels from "../components/OpenActionPanels";
import { getAppFavicon } from "../helpers/apps";
import { openProfileWithFeedback } from "../helpers/open-profile";
import { getMigratedAppId, STORAGE_KEYS } from "../helpers/storage";
import { useApps } from "../hooks/useApps";
import { useHistory } from "../hooks/useHistory";

interface OpenProfileFormProps {
  initialProfile?: string;
  initialApp?: string;
}

export default function OpenProfileForm({ initialProfile, initialApp }: OpenProfileFormProps) {
  const { visibleApps: apps, isLoading: isLoadingApps } = useApps();
  const { history, isLoading: isLoadingHistory } = useHistory();

  const profileHistory = [...new Set(history.map((item) => item.profile))];
  // The dropdown's value must be one of its items, so match a typed profile against these only
  const recentProfiles = profileHistory.slice(0, 10);

  const { value: profileValue, setValue: setProfileValue } = useLocalStorage<string>(
    "lastProfile",
    initialProfile || "",
  );
  const { value: selectedApp, setValue: setSelectedApp } = useLocalStorage<string>(
    STORAGE_KEYS.LAST_SELECTED_APP,
    initialApp || "",
  );
  const [selectedRecentProfile, setSelectedRecentProfile] = useState<string>("");

  // useLocalStorage reports isLoading again after every write, so "loaded" means the value has arrived once.
  const hasLoadedProfile = profileValue !== undefined;
  const hasLoadedSelectedApp = selectedApp !== undefined;

  // An app passed in (Manage Apps' "Open Profile on…") wins over the stored last app, once.
  // useLocalStorage only uses its initial value when nothing is stored, so apply it after storage has loaded.
  const appliedInitialApp = useRef(false);
  useEffect(() => {
    // Wait for a fresh app list too: the cached one can predate a show/hide in Manage Apps, and judging the
    // initial or stored app against it would select the wrong app.
    if (isLoadingApps || apps.length === 0 || !hasLoadedSelectedApp) return;

    if (initialApp && !appliedInitialApp.current) {
      appliedInitialApp.current = true;
      const query = initialApp.toLowerCase();
      const foundApp =
        apps.find((app) => app.value.toLowerCase() === query) ?? apps.find((app) => app.name.toLowerCase() === query);
      if (foundApp) {
        if (selectedApp !== foundApp.value) void setSelectedApp(foundApp.value);
        return;
      }
    }

    // Fallback: nothing stored, or the stored app is no longer visible. Waiting for the stored value matters:
    // apps come from a cache and arrive first, and defaulting then would overwrite the stored app with apps[0].
    // The stored value may also predate this process's migration, which renamed it in storage but not here.
    if (!apps.some((app) => app.value === selectedApp)) {
      let canceled = false;
      getMigratedAppId(selectedApp ?? "")
        .then((migrated) => {
          if (canceled) return;
          void setSelectedApp(apps.some((app) => app.value === migrated) ? migrated : apps[0].value);
        })
        // A failed migration already shows a failure toast from the app list load; keep the stored choice
        .catch(() => undefined);
      return () => {
        canceled = true;
      };
    }
  }, [initialApp, apps, isLoadingApps, hasLoadedSelectedApp, selectedApp]);

  // A profile passed in (command argument, History's "Open on…") wins over the stored last profile, once.
  const appliedInitialProfile = useRef(false);
  useEffect(() => {
    if (!hasLoadedProfile || appliedInitialProfile.current) return;
    appliedInitialProfile.current = true;
    if (initialProfile?.trim() && profileValue !== initialProfile) {
      void setProfileValue(initialProfile);
    }
  }, [hasLoadedProfile]);

  // Notify user if no apps are available after load
  useEffect(() => {
    if (!isLoadingApps && apps.length === 0) {
      void showError("No apps are shown. Show some in Manage Apps first.", { title: "No Apps Available" });
    }
  }, [isLoadingApps, apps]);

  const handleFormSubmit = async (values: { profile: string; app: string }) => {
    if (apps.length === 0) {
      await showError("Show some apps in Manage Apps first.", { title: "No Apps Shown" });
      return;
    }

    // Use the controlled profile value instead of form value
    const profileToUse = (profileValue || "").trim() || values.profile.trim();

    if (!profileToUse || !values.app) {
      await showError("Enter a profile and choose an app.", { title: "Missing Profile or App" });
      return;
    }

    await openProfileWithFeedback(profileToUse, values.app);
  };

  return (
    <Form
      isLoading={isLoadingApps || isLoadingHistory || !hasLoadedSelectedApp || !hasLoadedProfile}
      actions={<OpenActionPanels onSubmit={handleFormSubmit} />}
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
          const matchingProfile = recentProfiles.find(
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
          {recentProfiles.map((profile: string, index: number) => (
            <Form.Dropdown.Item
              key={`${profile}-${index}`}
              value={profile}
              title={profile.startsWith("@") ? profile : `@${profile}`}
            />
          ))}
        </Form.Dropdown>
      )}

      {apps.length > 0 && hasLoadedSelectedApp && (
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
