import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";

import { sendYjsBinaryUpdate } from "../api";

interface CommandForm {
  roomId: string;
  type: "LiveObject";
  payload: string;
}

export default function Command({ roomId }: { roomId: string }) {
  const [payload, setPayload] = useState("");

  async function handleSubmit(values: CommandForm) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Initializing the room...",
    });

    if (values.payload == "") {
      toast.style = Toast.Style.Failure;
      toast.title = "Payload is required";
      toast.show();
      return;
    }

    const data = Uint8Array.from(Buffer.from(values.payload, "base64"));

    sendYjsBinaryUpdate(roomId, data);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Yjs Binary Update" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="payload" title="Payload" value={payload} onChange={setPayload} placeholder="Enter Payload" />
    </Form>
  );
}
