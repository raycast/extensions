import {
  Action,
  ActionPanel,
  Form,
  getApplications,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  togglApiToken: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [apps, setApps] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    (async () => {
      // Fetch applications
      const appsResult = await getApplications();
      setApps(appsResult.map((app) => ({ name: app.name, path: app.path })));

      const apiToken = preferences.togglApiToken;
      const credentials = Buffer.from(`${apiToken}:api_token`).toString(
        "base64",
      );

      // https://engineering.toggl.com/docs/api/tasks/
      try {
        const response = await fetch("https://api.track.toggl.com/api/v9/me", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, ${errorText}`,
          );
        }

        const data = await response.json();
        console.log("Toggl data:", data);
        await showToast(Toast.Style.Success, "Successfully fetched Toggl data");
      } catch (error) {
        console.error("Failed to fetch Toggl data:", error);
        await showToast(
          Toast.Style.Failure,
          "Failed to fetch Toggl data",
          error instanceof Error ? error.message : undefined,
        );
      }
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open App"
            onSubmit={async (values) => {
              await showToast(Toast.Style.Success, `Opening ${values.app}`);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="app" title="Select an App" storeValue>
        {apps.map((app) => (
          <Form.Dropdown.Item
            key={app.path}
            title={app.name}
            value={app.path}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
