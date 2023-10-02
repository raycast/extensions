import { Action, ActionPanel, Form, LaunchProps, getPreferenceValues, open } from "@raycast/api";
import { useState } from "react";
import packageJson from "../package.json";
import { getExistingText, isUrl } from "./utils";

const servicePreference = packageJson.preferences.find((pref) => pref.name === "service");
const options = servicePreference?.data ?? [];

export default (props: LaunchProps) => {
  const { service: defaultService } = getPreferenceValues<Preferences>();

  const [url, setUrl] = useState<string>("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [service, setService] = useState<string>(defaultService);

  async function setUrlFromExistingText() {
    const text = await getExistingText(props.fallbackText);

    if (!isUrl(text)) {
      return;
    }

    setUrl(text);
  }

  if (!url) {
    setUrlFromExistingText();
  }

  function handleUrlBlur() {
    if (!url) {
      setUrlError("No URL provided.");
    } else if (!isUrl(url)) {
      setUrlError("Invalid URL.");
    } else {
      setUrlError(undefined);
    }
  }

  function handleSubmit() {
    open(`${service}/${url}`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Remove Paywall" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={url}
        error={urlError}
        onChange={setUrl}
        onBlur={handleUrlBlur}
      />
      <Form.Dropdown id="service" title="Service" value={service} onChange={setService}>
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
