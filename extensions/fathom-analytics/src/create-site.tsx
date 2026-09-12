import { ActionPanel, Form, Action, getPreferenceValues, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useState } from "react";
import got from "got";

import Preferences from "./interfaces/preference";

interface FormValues {
  name: string;
  sharing: string;
  share_password: null | string;
}

interface SiteResponse {
  id: string;
  object: string;
  name: string;
  sharing: string;
  created_at: Date;
}

const Command = () => {
  const preferences = getPreferenceValues<Preferences>();
  const [sharing, setSharing] = useState<string>();

  async function handleSubmit(values: FormValues) {
    const toast: Toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating site...",
    });

    try {
      const response: SiteResponse = await got
        .post("https://api.usefathom.com/v1/sites", {
          headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
          },
          json: values,
        })
        .json();

      Clipboard.copy(response.id);

      toast.style = Toast.Style.Success;
      toast.title = "Created site!";
      toast.message = "Site code has been copied to your clipboard.";
      toast.primaryAction = {
        title: "Open site",
        onAction: async () => {
          await open(`https://app.usefathom.com/#/?filters=%5B%5D&range=last_7_days&site=${response.id}`);
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Whoops!";
      toast.message = "Something went wrong while creating your site.";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Site Name" placeholder="Daffy's Website" />
      <Form.Dropdown id="sharing" title="Sharing" defaultValue="none" onChange={(val) => setSharing(val)}>
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="public" title="Public" />
      </Form.Dropdown>
      {sharing == "private" && <Form.TextField id="share_password" title="Password" placeholder="🤫 shhh...." />}
    </Form>
  );
};

export default Command;
