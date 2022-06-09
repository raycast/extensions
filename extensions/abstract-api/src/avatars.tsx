import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import fs from "fs";

interface Preferences {
  avatarsApiKey: string;
}

interface CommandForm {
  name: string;
}

async function downloadImage() {
  // const url = 'https://unsplash.com/photos/AaEQmoufHLk/download?force=true'
  const url = "https://avatars.abstractapi.com/v1/?api_key=48dc84fa22464373bb668097f081b4aa&name=Claire";

  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });

  response.data.pipe(fs.createWriteStream(`${process.env.HOME}/Desktop/test.png`));

  return new Promise<void>((resolve, reject) => {
    response.data.on("end", () => {
      resolve();
    });

    response.data.on("error", () => {
      reject();
    });
  });
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
      )}`;
      const { data } = await axios.get(url);

      await downloadImage();
      // const file = writeFileSync(`${process.env.HOME}/Desktop/${values.name}.png`,

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
