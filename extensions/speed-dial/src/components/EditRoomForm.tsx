import { useContext } from "react";
import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { RoomContext } from "../contexts/RoomsContext";
import { Room } from "../types";

export default function EditRoomForm(props: { room: Room }) {
  const { room } = props;
  const roomContext = useContext(RoomContext);

  if (!roomContext) {
    throw new Error("Command must be used within a RoomProvider");
  }

  const { editRoomName } = roomContext;

  const { handleSubmit, itemProps } = useForm<Room>({
    initialValues: room,
    onSubmit(values) {
      editRoomName({ url: room.url, name: values.name }).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Room name edited`,
        });
        popToRoot();
      });
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Meeting Room Name" placeholder="1-1 w/ James, Sales Standup..." {...itemProps.name} />
    </Form>
  );
}
