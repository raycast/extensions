import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { createWriteStream } from "fs";
import { homedir } from 'os';

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

    try {
      const url = `https://avatars.abstractapi.com/v1/?api_key=${preferences.avatarsApiKey}&name=${encodeURIComponent(
        values.name
      )}&image_format=png`;
      const { data } = await axios.get(url);

      const file = createWriteStream(`${homedir()}/Desktop/${values.name}.png`);
      file.write(data);
      file.close();

      toast.style = Toast.Style.Success;
      toast.title = "Avatar retrieved successfully";
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: (toast) => {
          open(url);

          toast.hide();
        },
      };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve avatar";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Avatar" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" />
    </Form>
  );
}
