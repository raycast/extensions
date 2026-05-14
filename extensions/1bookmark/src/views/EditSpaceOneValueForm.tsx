import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";

const userAndSpaceFields = ["myNickname", "myImage"] as const;
const spaceFields = ["name", "image", "description"] as const;

export type KeyToEdit = (typeof userAndSpaceFields)[number] | (typeof spaceFields)[number];

function Body(props: { spaceId: string; keyToEdit: KeyToEdit; value: string }) {
  const { spaceId, keyToEdit, value } = props;
  const [editingValue, setEditingValue] = useState(value);

  const { pop } = useNavigation();
  const update = trpc.space.update.useMutation();

  function handleSubmit() {
    update.mutate(
      { spaceId, [keyToEdit]: editingValue },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Updated space",
          });
          pop();
        },
      },
    );
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
