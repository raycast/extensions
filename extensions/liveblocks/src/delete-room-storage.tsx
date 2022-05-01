import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import axios from "axios";

interface CommandForm {
  roomId: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");

    try {
      await axios.delete(`https://liveblocks.net/api/v1/room/${values.roomId}/storage`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      showToast({ title: "Room storage deleted successful" });

      popToRoot();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unable to delete room storage",
      });
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
