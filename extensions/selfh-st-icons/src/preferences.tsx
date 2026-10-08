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
  theme: string;
  defaultFormat: string;
  downloadLocation: string;
  refreshInterval: string;
}

export default function PreferencesView() {
  const { pop } = useNavigation();
  const [preferences, setPreferencesState] = useState<Preferences>();
  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps, setValue } = useForm<PreferencesFormValues>({
    initialValues: preferences
      ? {
          theme: preferences.theme,
          defaultFormat: preferences.defaultFormat,
          downloadLocation: preferences.downloadLocation,
          refreshInterval: preferences.refreshInterval.toString(),
        }
      : undefined,
    onSubmit: async (values) => {
      try {
        await setPreferences({
          theme: values.theme as "system" | "light" | "dark",
          defaultFormat: values.defaultFormat as "png" | "webp" | "svg",
          downloadLocation: values.downloadLocation,
          refreshInterval: parseInt(values.refreshInterval),
        });
        await LocalStorage.setItem(
          "selfhst_preferences_updated",
          Date.now().toString(),
        );
        showToast({
          style: Toast.Style.Success,
          title: "Preferences updated",
          message: `Preferences saved successfully`,
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
      downloadLocation: (value) => {
        if (!value) {
          return "Download location is required";
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
      setValue("theme", prefs.theme);
      setValue("defaultFormat", prefs.defaultFormat);
      setValue("downloadLocation", prefs.downloadLocation);
      setValue("refreshInterval", prefs.refreshInterval.toString());
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
      <Form.Dropdown title="Default Theme" {...itemProps.theme}>
        <Form.Dropdown.Item value="system" title="System" />
        <Form.Dropdown.Item value="light" title="Light" />
        <Form.Dropdown.Item value="dark" title="Dark" />
      </Form.Dropdown>

      <Form.Dropdown title="Default File Type" {...itemProps.defaultFormat}>
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="webp" title="WebP" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>

      <Form.TextField
        title="Download Location"
        placeholder="~/Downloads"
        {...itemProps.downloadLocation}
        info="The folder where icons will be downloaded"
      />

      <Form.TextField
        title="Refresh Interval"
        placeholder="24"
        {...itemProps.refreshInterval}
        info="How often to refresh the icon index (in hours)"
      />
    </Form>
  );
}
