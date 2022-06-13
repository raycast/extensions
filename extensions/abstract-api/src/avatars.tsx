import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";

interface Preferences {
  avatarsApiKey: string;
}

interface CommandForm {
  name: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: CommandForm) {
    if (values.name == "") {
      showToast(Toast.Style.Failure, "Error", "Name is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving avatar...",
    });

    const baseUrl = "https://avatars.abstractapi.com/v1";
    const name = encodeURIComponent(values.name);
    const url = `${baseUrl}/?api_key=${preferences.avatarsApiKey}&name=${name}&image_format=png`;

    axios
      .get(url)
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "Avatar retrieved successfully";
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
            toast.title = "Saving avatar";

            await axios
              .get(url, { responseType: "stream" })
              .then((response) => {
                const filename = values.name.split(" ").join("_");
                response.data.pipe(fs.createWriteStream(`${homedir()}/Desktop/${filename}.png`));

                toast.style = Toast.Style.Success;
                toast.title = "Avatar saved successfully";
              })
              .catch((error) => {
                toast.style = Toast.Style.Failure;
                toast.title = "Unable to download avatar";
                toast.message = error.response.data.error.message ?? "";
              });
          },
        };
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve avatar";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Avatar" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" />
    </Form>
  );
}
