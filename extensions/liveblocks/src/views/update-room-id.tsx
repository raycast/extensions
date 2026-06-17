import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";

import { updateRoomId } from "../api";

interface CommandForm {
  newRoomId: string;
}

export default function Command({ roomId }: { roomId: string }) {
  const [newRoomId, setNewRoomId] = useState(roomId);

  async function handleSubmit(values: CommandForm) {
    if (values.newRoomId == "") {
      showToast(Toast.Style.Failure, "Error", "New Room ID is required");

      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating room ID...",
    });

    await updateRoomId(roomId, values.newRoomId);

    toast.style = Toast.Style.Success;
    toast.title = "Room ID updated successfully";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Room ID" onSubmit={handleSubmit} icon={Icon.Pencil} />
          <Action.OpenInBrowser
            title="Open in Dashboard"
            url={`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(roomId)}`}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newRoomId"
        title="New Room ID"
        value={newRoomId}
        onChange={setNewRoomId}
        placeholder="Enter New Room ID"
      />
    </Form>
  );
}
