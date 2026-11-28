import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { Room, errorMessage, renameRoom } from "./api";

export function RenameForm({ room, onDone }: { room: Room; onDone?: () => void }) {
  const { pop } = useNavigation();

  async function submit({ name }: { name: string }) {
    const newName = name.trim();
    if (!newName) {
      await showToast({ style: Toast.Style.Failure, title: "Name cannot be empty" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming…" });
    try {
      await renameRoom(room, newName);
      toast.style = Toast.Style.Success;
      toast.title = `Renamed “${room.name}” to “${newName}”`;
      onDone?.();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = errorMessage(e);
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${room.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Name" defaultValue={room.name} autoFocus />
    </Form>
  );
}
