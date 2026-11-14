import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import ScreenshotResult from "./components/ScreenshotResult";
import { Device, ImageFormat, normalizeUrl, urlValidationError } from "./lib/api";
import { DEVICE_TITLES, FORMAT_TITLES } from "./lib/labels";
import { getActiveTabUrl, getDefaults } from "./lib/raycast";

interface FormValues {
  url: string;
  device: string;
  format: string;
  fullPage: boolean;
  darkMode: boolean;
}

export default function Command() {
  const { push } = useNavigation();
  const defaults = getDefaults();
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { url: "", device: defaults.device, format: defaults.format, fullPage: false, darkMode: false },
    validation: {
      url: urlValidationError,
      device: FormValidation.Required,
      format: FormValidation.Required,
    },
    onSubmit: (values) => {
      push(
        <ScreenshotResult
          options={{
            url: normalizeUrl(values.url),
            device: values.device as Device | "desktop",
            format: values.format as ImageFormat,
            fullPage: values.fullPage,
            darkMode: values.darkMode,
          }}
        />,
      );
    },
  });
  // Prefill with the open browser tab, but never replace a URL the user has already typed.
  const { isLoading } = usePromise(getActiveTabUrl, [], {
    onData: (tabUrl) => {
      if (tabUrl) setValue("url", (current) => current || tabUrl);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Screenshot" icon={Icon.Camera} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://example.com" {...itemProps.url} />
      <Form.Dropdown title="Device" {...itemProps.device}>
        {Object.entries(DEVICE_TITLES).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Format" {...itemProps.format}>
        {Object.entries(FORMAT_TITLES).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox title="Options" label="Full page" {...itemProps.fullPage} />
      <Form.Checkbox label="Dark mode" {...itemProps.darkMode} />
      <Form.Description text="Ads and cookie banners are removed. Each screenshot uses one capture from your monthly allowance." />
    </Form>
  );
}
