import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { addChannel, getChannelTitle } from "./utils/storage";

export default function AddChannel() {
  const [channelId, setChannelId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!channelId.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a channel ID",
      });
      return;
    }

    setIsLoading(true);
    try {
      const title = await getChannelTitle(channelId);
      await addChannel({ id: channelId, title });
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Channel ${title} has been added`,
      });
      setChannelId("");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Channel" onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="channelId"
        title="Channel ID"
        placeholder="Example: UCRlsJWh1XwmNGxZPFgJ0Zlw"
        value={channelId}
        onChange={setChannelId}
        info="The ID can be found in the YouTube channel URL"
      />
    </Form>
  );
}
