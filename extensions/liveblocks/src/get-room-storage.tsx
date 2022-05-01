import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface CommandForm {
  roomId: string;
}

export default function Command() {
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");

    try {
      const { data } = await axios.get(`https://liveblocks.net/api/v1/room/${values.roomId}/storage/json`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      showToast({ title: "Request successful" });

      setOutput(JSON.stringify(data));
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unable to fetch room storage",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Room Storage" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Output" text={output ? output : "Waiting for output..."} />
      <Form.Description text="" />
      {/* spacer */}
      <Form.Separator />
      <Form.TextField
        id="roomId"
        title="Room ID"
        placeholder="Enter room ID"
        defaultValue="room-a04f59f647aaa9c8880ab"
      />
    </Form>
  );
}
