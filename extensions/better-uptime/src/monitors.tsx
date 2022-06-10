import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  apiKey: string;
}

interface CommandForm {
  url: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    if (values.url == "") {
      showToast(Toast.Style.Failure, "Error", "URL is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving monitors...",
    });

    try {
      const url = `https://betteruptime.com/api/v2/monitors?url=${encodeURIComponent(values.url)}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${preferences.apiKey}` }
      });

      toast.style = Toast.Style.Success;
      toast.title = "Monitors retrieved successfully";

      setOutput(JSON.stringify(data));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve monitors";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Monitors" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL" />
      {output ? (
        <>
          <Form.Separator />
          {/* spacer */}
          <Form.Description text="" />
          <Form.Description title="Output" text={output} />
        </>
      ) : null}
    </Form>
  );
}
