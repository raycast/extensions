import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface Preferences {
  screenshotApiKey: string;
}

interface CommandForm {
  websiteUrl: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: CommandForm) {
    if (values.websiteUrl == "") {
      showToast(Toast.Style.Failure, "Error", "IP address is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving screenshot...",
    });

    try {
      const url = `https://screenshot.abstractapi.com/v1/?api_key=${
        preferences.screenshotApiKey
      }&url=${encodeURIComponent(values.websiteUrl)}`;
      const { data } = await axios.get(url);

      toast.style = Toast.Style.Success;
      toast.title = "Screenshot retrieved successfully";
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: (toast) => {
          open(url);

          toast.hide();
        },
      };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve screenshot";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Screenshot" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="websiteUrl" title="Website URL" placeholder="Enter website URL" />
    </Form>
  );
}
