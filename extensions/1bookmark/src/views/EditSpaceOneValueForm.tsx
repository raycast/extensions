import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";

export type KeyToEdit = "name" | "image" | "description";

function Body(props: { spaceId: string; keyToEdit: KeyToEdit; value: string }) {
  const { spaceId, keyToEdit, value } = props;
  const [editingValue, setEditingValue] = useState(value);

  const { pop } = useNavigation();
  const update = trpc.space.update.useMutation();

  async function handleSubmit() {
    try {
      await update.mutateAsync({ spaceId, [keyToEdit]: editingValue });
      showToast({
        style: Toast.Style.Success,
        title: "Updated space",
      });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update space",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={keyToEdit.charAt(0).toUpperCase() + keyToEdit.slice(1)}
        autoFocus
        value={editingValue}
        onChange={(value) => setEditingValue(value)}
      />
    </Form>
  );
}

export const EditSpaceOneValueForm = (props: { spaceId: string; keyToEdit: KeyToEdit; value: string }) => {
  const { spaceId, keyToEdit, value } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} keyToEdit={keyToEdit} value={value} />
    </CachedQueryClientProvider>
  );
};
