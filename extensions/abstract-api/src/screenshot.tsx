import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";
import { extractHostname } from "./utils";

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

    const baseUrl = "https://screenshot.abstractapi.com/v1";
    const formUrl = encodeURIComponent(values.websiteUrl);
    const url = `${baseUrl}/?api_key=${preferences.screenshotApiKey}&url=${formUrl}`;

    axios
      .get(url)
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Screenshot retrieved successfully";
        toast.message = "Hover over the toast to see available actions";
        toast.primaryAction = {
          title: "Open in Browser",
          onAction: (toast) => {
            open(url);

            toast.hide();
          },
        };
        toast.secondaryAction = {
          title: "Download",
          onAction: async (toast) => {
            toast.style = Toast.Style.Animated;
            toast.title = "Saving screenshot";

            await axios
              .get(url, { responseType: "stream" })
              .then((response) => {
                const hostname = extractHostname(values.websiteUrl);
                response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${hostname}.png`));

                toast.style = Toast.Style.Success;
                toast.title = "Screenshot saved successfully";
              })
              .catch((error) => {
                toast.style = Toast.Style.Failure;
                toast.title = "Unable to retrieve screenshot";
                toast.message = error.response.data.error.message ?? "";
              });
          },
        };
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve screenshot";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Screenshot" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="websiteUrl" title="Website URL" placeholder="Enter website URL" />
    </Form>
  );
}
