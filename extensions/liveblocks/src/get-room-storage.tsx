import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, open, Icon } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { getTokenFromSecret } from "./utils";

interface CommandForm {
  roomId: string;
}

export default function Command() {
  const [output, setOutput] = useState("");

  useEffect(() => {
    getTokenFromSecret();
  }, []);

  async function handleSubmit(values: CommandForm) {
    if (values.roomId == "") {
      showToast(Toast.Style.Failure, "Error", "Room ID is required");
      return;
    }

    const jwt = await LocalStorage.getItem<string>("liveblocks-jwt");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving room storage...",
    });

    try {
      const { data } = await axios.get(
        `https://liveblocks.net/api/v1/room/${encodeURIComponent(values.roomId)}/storage/json`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      toast.style = Toast.Style.Success;
      toast.title = "Room storage retrieved successfully";
      toast.primaryAction = {
        title: "Open in Dashboard",
        onAction: (toast) => {
          open(`https://liveblocks.io/dashboard/rooms/${encodeURIComponent(values.roomId)}`);
          toast.hide();
        },
      };

      setOutput(JSON.stringify(data));
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to retrieve room storage";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Room Storage" onSubmit={handleSubmit} icon={Icon.Pencil} />
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
