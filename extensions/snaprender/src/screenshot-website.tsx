import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import ScreenshotResult from "./components/ScreenshotResult";
import { Device, ImageFormat, SnapRenderError, normalizeUrl } from "./lib/api";
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
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getActiveTabUrl()
      .then((tabUrl) => {
        if (!cancelled && tabUrl) setUrl((current) => current || tabUrl);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(values: FormValues) {
    let normalized: string;
    try {
      normalized = normalizeUrl(values.url);
    } catch (error) {
      setUrlError(error instanceof SnapRenderError ? error.detail : "Enter a valid URL");
      return;
    }
    push(
      <ScreenshotResult
        options={{
          url: normalized,
          device: values.device as Device | "desktop",
          format: values.format as ImageFormat,
          fullPage: values.fullPage,
          darkMode: values.darkMode,
        }}
      />,
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Screenshot" icon={Icon.Camera} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
          if (urlError) setUrlError(undefined);
        }}
      />
      <Form.Dropdown id="device" title="Device" defaultValue={defaults.device}>
        {Object.entries(DEVICE_TITLES).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="format" title="Format" defaultValue={defaults.format}>
        {Object.entries(FORMAT_TITLES).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="fullPage" title="Options" label="Full page" defaultValue={false} />
      <Form.Checkbox id="darkMode" label="Dark mode" defaultValue={false} />
      <Form.Description text="Ads and cookie banners are removed. Each screenshot uses one capture from your monthly allowance." />
    </Form>
  );
}
