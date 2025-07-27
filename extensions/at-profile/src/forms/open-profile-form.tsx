import { ActionPanel, Action, Form, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getAllApps, getAppFavicon } from "../hooks/apps";
import { openProfile } from "../utils/open-profile";
import { useEffect, useState } from "react";
import { App, OpenProfileFormProps } from "../types";

export default function OpenProfileForm({ initialProfile, initialApp }: OpenProfileFormProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  useEffect(() => {
    async function loadApps() {
      setIsLoadingApps(true);
      try {
        const allApps = await getAllApps();
        setApps(allApps);

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

  const handleFormSubmit = async (values: { profile: string; app: string }) => {
    if (apps.length === 0) {
      await showFailureToast("Please enable apps in Manage Apps first", { title: "No apps enabled" });
      return;
    }

    if (!values.profile.trim() || !values.app) {
      await showFailureToast("Please enter a profile and select an app", { title: "Invalid input" });
      return;
    }

    await openProfile(values.profile, values.app);
  };

  return (
    <Form
      isLoading={isLoadingApps}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Profile" icon={Icon.Globe} onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="profile"
        title="Profile"
        placeholder="Enter profile (with or without @)"
        info="The profile name to open (@ symbol is optional)"
        defaultValue={initialProfile || ""}
      />

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
