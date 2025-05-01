import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getPreferences,
  setPreferences,
  Preferences,
} from "./utils/preferences";
import { showFailureToast } from "@raycast/utils";
export default function PreferencesView() {
  const { pop } = useNavigation();
  const [preferences, setPreferencesState] = useState<Preferences>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getPreferences();
      setPreferencesState(prefs);
      setIsLoading(false);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load preferences" });
    }
  };

  const handleSubmit = useCallback(
    async (values: Preferences) => {
      try {
        await setPreferences(values);
        // Store the last update timestamp to trigger the main view's watcher
        await LocalStorage.setItem(
          "preferences_updated",
          Date.now().toString(),
        );
        showToast({ style: Toast.Style.Success, title: "Preferences saved" });
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to save preferences" });
      }
    },
    [pop],
  );

  if (!preferences || isLoading) {
    return null;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="theme"
        title="Default Theme"
        defaultValue={preferences.theme}
      >
        <Form.Dropdown.Item value="system" title="System" />
        <Form.Dropdown.Item value="light" title="Light" />
        <Form.Dropdown.Item value="dark" title="Dark" />
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultFormat"
        title="Default File Type"
        defaultValue={preferences.defaultFormat}
      >
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="webp" title="WebP" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>

      <Form.TextField
        id="downloadLocation"
        title="Download Location"
        placeholder="~/Downloads"
        defaultValue={preferences.downloadLocation}
        info="The folder where icons will be downloaded"
      />

      <Form.TextField
        id="refreshInterval"
        title="Refresh Interval (hours)"
        placeholder="24"
        defaultValue={String(preferences.refreshInterval)}
        info="How often to refresh the icon index"
        validation={{
          value: /^[1-9]\d*$/,
          message: "Please enter a positive number"
        }}
      />
    </Form>
  );
}
