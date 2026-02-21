import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { getBrowserIcon, getBrowserTitle } from "../lib/browsers";
import { readVeljaConfig } from "../lib/velja";
import { openUrlInBrowserProfile } from "../lib/url-actions";

type FormValues = {
  url: string;
  browser: string;
};

export default function Command() {
  const browsers = readVeljaConfig().preferredBrowsers;

  async function handleSubmit(values: FormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Opening URL..." });

    try {
      if (!values.url.trim()) {
        throw new Error("URL is required");
      }

      if (!values.browser) {
        throw new Error("Browser is required");
      }

      openUrlInBrowserProfile(values.url, values.browser);
      await showToast({ style: Toast.Style.Success, title: "Opened URL in browser" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open URL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (browsers.length === 0) {
    return (
      <Form>
        <Form.Description text="No browsers found in Velja preferences." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open URL in Browser" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
      <Form.Dropdown id="browser" title="Browser" defaultValue={browsers[0]}>
        {browsers.map((identifier) => (
          <Form.Dropdown.Item
            key={identifier}
            value={identifier}
            title={getBrowserTitle(identifier)}
            icon={getBrowserIcon(identifier)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
