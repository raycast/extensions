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
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving room storage...",
    });

    try {
      const { data } = await axios.get(`https://liveblocks.net/api/v1/room/${values.roomId}/storage/json`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      toast.style = Toast.Style.Success;
      toast.message = "Room storage retrieved successfully";

      setOutput(JSON.stringify(data));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.message = "Unable to retrieve room storage";
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
      <Form.TextField id="roomId" title="Room ID" placeholder="Enter room ID" />
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
