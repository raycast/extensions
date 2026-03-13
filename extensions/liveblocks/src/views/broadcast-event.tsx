import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { JsonObject } from "@liveblocks/node";

import { broadcastEvent } from "../api";

interface CommandForm {
  data: JsonObject;
}

export default function Command({ roomId }: { roomId: string }) {
  const [data, setData] = useState(`{
  type: "EMOJI",
  emoji: "🔥",
}`);

  async function handleSubmit(values: CommandForm) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Broadcasting event...",
    });

    await broadcastEvent(roomId, values.data);

    toast.style = Toast.Style.Success;
    toast.title = "Event broadcasted successfully";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Broadcast Event" onSubmit={handleSubmit} icon={Icon.Airplane} />
          <Action.OpenInBrowser
            title="Open in Dashboard"
            url={`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(roomId)}`}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="data" title="Data" value={data} onChange={setData} placeholder="Enter Event Data" />
    </Form>
  );
}
