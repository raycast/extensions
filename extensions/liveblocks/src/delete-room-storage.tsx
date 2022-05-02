import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import axios from "axios";
import { useEffect } from "react";
import { getTokenFromSecret } from "./utils";

interface CommandForm {
  roomId: string;
}

export default function Command() {
  useEffect(() => {
    getTokenFromSecret();
  }, []);

  async function handleSubmit(values: CommandForm) {
    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting the room...",
    });

    try {
      await axios.delete(`https://liveblocks.net/api/v1/room/${values.roomId}/storage`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      toast.style = Toast.Style.Success;
      toast.message = "Room deleted successfully";

      popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.message = "Unable to delete the room";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete Room Storage" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="roomId" title="Room ID" placeholder="Enter room ID" />
    </Form>
  );
}
