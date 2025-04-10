import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";

function Body(props: { name: string }) {
  const { name } = props;
  const [editingName, setEditingName] = useState(name);

  const { pop } = useNavigation();
  const update = trpc.user.updateName.useMutation();

  function handleSubmit() {
    update.mutate(
      { name: editingName },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Updated profile",
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
          <Action.SubmitForm title="Edit" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        autoFocus
        value={editingName}
        onChange={(value) => setEditingName(value)}
      />
    </Form>
  );
}

export const EditProfileNameForm = (props: { name: string }) => {
  const { name } = props;
  return (
    <CachedQueryClientProvider>
      <Body name={name} />
    </CachedQueryClientProvider>
  );
};
