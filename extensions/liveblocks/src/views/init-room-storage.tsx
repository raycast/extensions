import { Form, ActionPanel, Action, showToast, Toast, open, Icon } from "@raycast/api";
import { useRef, useState } from "react";
import { initRoomStorage } from "../api";

interface CommandForm {
  roomId: string;
  type: "LiveObject";
  payload: string;
}

export default function Command({ roomId }: { roomId: string }) {
  const [payload, setPayload] = useState("");
  const roomIdFieldRef = useRef<Form.TextField>(null);

  async function handleSubmit(values: CommandForm) {
    if (values.roomId == "") {
      roomIdFieldRef.current?.focus();
      showToast(Toast.Style.Failure, "Error", "Room ID is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Initializing the room...",
    });

    if (values.payload == "") {
      values.payload = "{}";
    }

    try {
      initRoomStorage(roomId, values.type, values.payload);

      toast.style = Toast.Style.Success;
      toast.title = "Room initialized successfully";
      toast.primaryAction = {
        title: "Open in Dashboard",
        onAction: (toast) => {
          open(`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(roomId)}`);
          toast.hide();
        },
      };

      roomIdFieldRef.current?.focus();
      setPayload("");
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to initialize room";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Initialize Room Storage" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" defaultValue="LiveObject">
        <Form.Dropdown.Item value="LiveObject" title="LiveObject" />
        <Form.Dropdown.Item value="LiveList" title="LiveList" />
        <Form.Dropdown.Item value="LiveMap" title="LiveMap" />
      </Form.Dropdown>
      <Form.TextArea id="payload" title="Payload" value={payload} onChange={setPayload} placeholder="Enter Payload" />
    </Form>
  );
}
