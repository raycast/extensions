import { useContext } from "react";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { RoomContext } from "../contexts/RoomsContext";
import { Room } from "../types";

export default function EditRoomForm(props: {
  room: Room;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { room, setRefreshKey } = props;
  const roomContext = useContext(RoomContext);
  const nav = useNavigation();

  if (!roomContext) {
    throw new Error("EditRoomForm must be used within a RoomProvider");
  }

  const { editRoomName } = roomContext;

  const { handleSubmit, itemProps } = useForm<Room>({
    initialValues: room,
    onSubmit(values) {
      editRoomName({ url: room.url, name: values.name }).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Room name edited to "${values.name}"`,
        });
        nav.pop();
        setRefreshKey((prevKey) => prevKey + 1);
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
