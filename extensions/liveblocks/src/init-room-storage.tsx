import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, open, Icon } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { getTokenFromSecret } from "./utils";

interface CommandForm {
  roomId: string;
  type: string;
  payload: string;
}

export default function Command() {
  const [roomId, setRoomId] = useState("");
  const [payload, setPayload] = useState("");

  useEffect(() => {
    getTokenFromSecret();
  }, []);

  async function handleSubmit(values: CommandForm) {
    if (values.roomId == "") {
      showToast(Toast.Style.Failure, "Error", "Room ID is required");
      return;
    }

    if (values.payload == "") {
      showToast(Toast.Style.Failure, "Error", "Payload is required");
      return;
    }

    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Initializing the room...",
    });

    if (values.payload == "") {
      values.payload = "{}";
    }

    try {
      const { data } = await axios.post(
        `https://liveblocks.net/api/v1/room/${encodeURIComponent(values.roomId)}/storage/json`,
        {
          data: {
            liveblocksType: values.type,
            data: JSON.parse(values.payload),
          },
        },
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      toast.style = Toast.Style.Success;
      toast.message = "Room initialized successfully";
      toast.primaryAction = {
        title: "Open in Dashboard",
        onAction: (toast) => {
          open(`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(values.roomId)}`);
          toast.hide();
        },
      };

      setRoomId("");
      setPayload("");
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.message = "Unable to initialize room";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Initalize Room Storage" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField id="roomId" title="Room ID" value={roomId} onChange={setRoomId} placeholder="Enter room ID" />
      <Form.Dropdown id="type" title="Type" defaultValue="LiveObject">
        <Form.Dropdown.Item value="LiveObject" title="LiveObject" />
        <Form.Dropdown.Item value="LiveList" title="LiveList" />
        <Form.Dropdown.Item value="LiveMap" title="LiveMap" />
      </Form.Dropdown>
      <Form.TextArea id="payload" title="Payload" value={payload} onChange={setPayload} placeholder="{}" />
    </Form>
  );
}
