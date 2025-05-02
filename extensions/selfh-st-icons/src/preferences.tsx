import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getPreferences,
  setPreferences,
  Preferences,
} from "./utils/preferences";
import { showFailureToast } from "@raycast/utils";
import { useForm } from "@raycast/utils";

interface PreferencesFormValues {
  refreshInterval: string;
}

export default function PreferencesView() {
  const { pop } = useNavigation();
  const [preferences, setPreferencesState] = useState<Preferences>();
  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps } = useForm<PreferencesFormValues>({
    onSubmit: async (values) => {
      try {
        await setPreferences({
          ...preferences,
          refreshInterval: parseInt(values.refreshInterval),
        });
        // Store the last update timestamp to trigger the main view's watcher
        await LocalStorage.setItem(
          "selfhst_preferences_updated",
          Date.now().toString(),
        );
        showToast({
          style: Toast.Style.Success,
          title: "Preferences updated",
          message: `Refresh interval set to ${values.refreshInterval} hours`,
        });
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to save preferences" });
      }
    },
    validation: {
      refreshInterval: (value) => {
        if (!value) {
          return "The refresh interval is required";
        }
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return "Please enter a positive number";
        }
      },
    },
  });

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

  if (!preferences || isLoading) {
    return <Form isLoading={true} />;
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
        {...itemProps.refreshInterval}
        title="Refresh Interval"
        placeholder="24"
        info="How often to refresh the icon index (in hours)"
      />
    </Form>
  );
}
