import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useRef } from "react";

interface FormValues {
  name: string;
  image: string;
  description: string;
}

function Body() {
  const textFieldRef = useRef<Form.TextField>(null);
  const textAreaRef = useRef<Form.TextArea>(null);

  const { pop } = useNavigation();
  const create = trpc.team.create.useMutation();

  async function handleSubmit(form: FormValues) {
    await create.mutateAsync({
      name: form.name,
      image: form.image,
      description: form.description,
    });
    showToast({
      style: Toast.Style.Success,
      title: "Space created",
    });
    // TODO: Move to Spaces view.
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" ref={textFieldRef} />
      <Form.TextField
        id="image"
        title="Image"
        placeholder="https://..."
        info="Image upload is not supported yet. Please enter the space logo image url."
      />
      <Form.TextArea id="description" title="Description" ref={textAreaRef} />
    </Form>
  );
}

export const NewSpaceForm = () => {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
};
