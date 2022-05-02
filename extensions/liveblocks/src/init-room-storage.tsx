import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface CommandForm {
  roomId: string;
  payload: string;
}

export default function Command() {
  const [output, setOutput] = useState("");

  async function handleSubmit(values: CommandForm) {
    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Initializing the room",
    });

    try {
      const { data } = await axios.post(
        `https://liveblocks.net/api/v1/room/${values.roomId}/storage/json`,
        {
          data: values.payload,
        },
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      toast.style = Toast.Style.Success;
      toast.message = "Room initialized successfully";

      setOutput(JSON.stringify(data));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.message = "Unable to initialize room";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Initalize Room Storage" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="roomId" title="Room ID" placeholder="Enter room ID" />
      <Form.TextArea id="payload" title="Payload" placeholder="Enter payload" />
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
